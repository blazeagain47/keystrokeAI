// POST /api/party/join
//
// Resolves a 6-digit public code to its internal partyId + full party
// config so the joining client knows where to point its PartyKit
// WebSocket. This route ONLY READS Firestore. It deliberately does not
// claim the guest slot in the database — guest membership is owned by the
// PartyKit room (Phase 3 state machine). That keeps the audit doc thin and
// avoids races between this endpoint and the live room.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAdminDb } from "@/lib/firebaseAdmin";
import { isValidCodeShape, normalizeCodeInput } from "@/lib/party/code";
import { getRoomSummary } from "@/lib/party/serverConfig";
import type { JoinPartyResponse } from "@/lib/party/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "default-no-store";

const BodySchema = z.object({
  code: z.string().min(1).max(32),
  guestPlayerId: z.string().min(1).max(128),
});

const COLLECTION = "parties_v1";

export async function POST(req: NextRequest) {
  const parsed = await req.json().then(BodySchema.safeParseAsync).catch(() => null);
  if (!parsed || !parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed?.error?.issues ?? null },
      { status: 400 },
    );
  }

  const normalized = normalizeCodeInput(parsed.data.code);
  if (!normalized || !isValidCodeShape(normalized)) {
    return NextResponse.json({ error: "invalid_code_shape" }, { status: 400 });
  }

  let db;
  try {
    db = getAdminDb();
  } catch (e: any) {
    return NextResponse.json(
      { error: "firebase_unavailable", detail: String(e?.message ?? e) },
      { status: 503 },
    );
  }

  // Lookup: active party with this code. Two equality predicates, no
  // composite index required.
  let snap;
  try {
    snap = await db
      .collection(COLLECTION)
      .where("code", "==", normalized)
      .where("active", "==", true)
      .limit(1)
      .get();
  } catch (e: any) {
    return NextResponse.json(
      { error: "firestore_query_failed", detail: String(e?.message ?? e) },
      { status: 500 },
    );
  }

  if (snap.empty) {
    return NextResponse.json({ error: "party_not_found" }, { status: 404 });
  }

  const doc = snap.docs[0];
  const data = doc.data();

  // Defensive expiry check against Firestore clock (fast path before the
  // live PartyKit call below).
  const now = Date.now();
  const expiresAtMs = Number(data?.expiresAtMs ?? 0);
  if (expiresAtMs && expiresAtMs <= now) {
    return NextResponse.json({ error: "party_expired" }, { status: 410 });
  }

  const partyId = String(data.partyId);
  const guestPlayerId = parsed.data.guestPlayerId;

  // ── Live capacity check ────────────────────────────────────────────────
  // The Firestore audit doc is written once at creation (status="waiting",
  // guestId=null) and is never updated with live changes. It therefore
  // cannot answer "is this room full?" or "has the race already started?"
  // We must ask the PartyKit room directly.
  //
  // Fail closed: if PartyKit is unreachable we cannot verify capacity, so
  // we reject rather than silently allow a third player in.
  const live = await getRoomSummary(partyId);
  if (!live) {
    return NextResponse.json(
      { error: "partykit_unavailable", detail: "could not verify room capacity" },
      { status: 503 },
    );
  }

  // Seat membership: a host or the KNOWN guest is reclaiming their own slot,
  // not adding a new one. Seat membership alone is NOT enough to admit a new
  // socket — see the duplicate-active-tab guard below.
  const isSeatMember =
    guestPlayerId === live.hostId || guestPlayerId === live.guestId;

  // ── Duplicate ACTIVE tab/window guard ──────────────────────────────────
  // Multiple browser tabs/windows in the same (incognito) session share the
  // same `bk_guest_id` (== playerId). If this playerId ALREADY holds a live
  // socket in the room, this request is a duplicate browser trying to open the
  // same seat — reject it. A genuine reconnect after a tab closes won't appear
  // in `activePlayerIds` (its socket is gone), so this does not break reconnect.
  //
  // `activePlayerIds` is only present on rooms running the updated server. If
  // it's missing we fall through to the seat checks below; the PartyKit
  // onConnect gate is the authoritative backstop in that case.
  const activeIds = Array.isArray(live.activePlayerIds)
    ? live.activePlayerIds
    : null;
  if (activeIds && activeIds.includes(guestPlayerId)) {
    return NextResponse.json(
      { error: "player_already_connected" },
      { status: 409 },
    );
  }

  // Reject a new (third) UNIQUE player if the guest slot is already taken.
  if (live.guestId !== null && !isSeatMember) {
    return NextResponse.json({ error: "party_full" }, { status: 409 });
  }

  // Reject a new (third) player if the room is already past the lobby.
  const blockedStatuses = ["countdown", "active", "finished", "expired"] as const;
  if (
    blockedStatuses.includes(live.status as typeof blockedStatuses[number]) &&
    !isSeatMember
  ) {
    return NextResponse.json(
      { error: "party_not_joinable", status: live.status },
      { status: 409 },
    );
  }

  const resp: JoinPartyResponse = {
    partyId,
    code: normalized,
    testConfig: data.testConfig,
    testContent: String(data.testContent ?? ""),
    hostId: String(data.hostId ?? ""),
    // Return the live status so the client renders the right initial screen
    // (lobby vs countdown vs active reconnect).
    status: live.status as JoinPartyResponse["status"],
    expiresAt: expiresAtMs || now,
  };
  return NextResponse.json(resp, { status: 200 });
}
