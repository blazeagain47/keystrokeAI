// POST /api/party/rematch
//
// Starts a new round ("play again") in an existing party WITHOUT minting a new
// code. Both players must have signalled rematch readiness over the PartyKit
// socket first; this route is the privileged step that (a) verifies the caller
// belongs to the party, (b) generates fresh shared content in the Next.js
// runtime, and (c) pushes a `next_round` op to the PartyKit room using the
// SERVER-ONLY admin token.
//
// Security:
//   - The browser never sends or sees PARTYKIT_ADMIN_TOKEN.
//   - The caller's playerId must match the live room's hostId or guestId.
//   - If the live room cannot be verified, we FAIL CLOSED (no round advance).

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAdminDb } from "@/lib/firebaseAdmin";
import { generatePartyContent } from "@/lib/party/contentGen";
import { getRoomSummary, pushNextRound } from "@/lib/party/serverConfig";
import type { PartyTestConfig } from "@/lib/party/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "default-no-store";

const BodySchema = z.object({
  partyId: z.string().min(1).max(128),
  playerId: z.string().min(1).max(128),
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
  const { partyId, playerId } = parsed.data;

  // 1. Verify the live room and the caller's membership. Fail closed if the
  //    PartyKit room cannot be reached.
  const live = await getRoomSummary(partyId);
  if (!live) {
    return NextResponse.json(
      { error: "partykit_unavailable", detail: "could not verify room" },
      { status: 503 },
    );
  }
  const isParticipant = playerId === live.hostId || playerId === live.guestId;
  if (!isParticipant) {
    return NextResponse.json({ error: "not_a_participant" }, { status: 403 });
  }
  // Only a finished round can be rematched.
  if (live.status !== "finished") {
    return NextResponse.json(
      { error: "not_finished", status: live.status },
      { status: 409 },
    );
  }

  // 2. Read the party's test config from the audit doc so the new round uses
  //    the same settings (words mode only for this phase).
  let db;
  try {
    db = getAdminDb();
  } catch (e: any) {
    return NextResponse.json(
      { error: "firebase_unavailable", detail: String(e?.message ?? e) },
      { status: 503 },
    );
  }

  let testConfig: PartyTestConfig | null = null;
  try {
    const doc = await db.collection(COLLECTION).doc(partyId).get();
    if (doc.exists) {
      testConfig = (doc.data()?.testConfig ?? null) as PartyTestConfig | null;
    }
  } catch (e: any) {
    return NextResponse.json(
      { error: "firestore_query_failed", detail: String(e?.message ?? e) },
      { status: 500 },
    );
  }
  if (!testConfig || testConfig.mode !== "words") {
    return NextResponse.json({ error: "unsupported_config" }, { status: 400 });
  }

  // 3. Generate fresh shared content.
  let content: ReturnType<typeof generatePartyContent>;
  try {
    content = generatePartyContent(testConfig);
  } catch (e: any) {
    return NextResponse.json(
      { error: "content_generation_failed", detail: String(e?.message ?? e) },
      { status: 500 },
    );
  }

  // 4. Push the next-round op to PartyKit (admin-authed, server-side only).
  try {
    const result = await pushNextRound(partyId, {
      fromRoundId: live.roundId,
      testContent: content.text,
      contentSeed: content.seed,
    });
    return NextResponse.json({ ok: true, roundId: result.roundId }, { status: 200 });
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    // The room may legitimately refuse (e.g. not both ready yet); surface 409.
    if (msg.includes("_409:")) {
      return NextResponse.json({ error: "rematch_rejected", detail: msg }, { status: 409 });
    }
    return NextResponse.json(
      { error: "partykit_next_round_failed", detail: msg },
      { status: 502 },
    );
  }
}
