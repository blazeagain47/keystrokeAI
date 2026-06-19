// POST /api/party/create
//
// Mints a unique 6-digit code, generates the shared testContent, writes the
// Firestore audit doc, and seals the matching PartyKit room with its
// initial authoritative state. Returns the public code + the internal
// partyId so the client can navigate to /party/{code} and connect to the
// PartyKit room by partyId.
//
// Phase 1 supports words mode only. Anonymous: trusts the body's
// hostPlayerId (which is the existing bk_guest_id reused for parties).

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { getAdminDb, serverTs } from "@/lib/firebaseAdmin";
import { mintUniqueCode } from "@/lib/party/code";
import { generatePartyContent } from "@/lib/party/contentGen";
import { hydratePartyRoom } from "@/lib/party/serverConfig";
import {
  PROTOCOL_VERSION,
  type CreatePartyResponse,
  type PartyRoomState,
  type PartyTestConfig,
} from "@/lib/party/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "default-no-store";

// ─── Validation ────────────────────────────────────────────────────────────

const TestConfigSchema = z.object({
  mode: z.literal("words"), // MVP: words mode only
  wordCount: z.number().int().min(10).max(100),
  flags: z.object({
    punctuation: z.boolean(),
    numbers: z.boolean(),
  }),
  language: z.string().default("english"),
});

const BodySchema = z.object({
  hostPlayerId: z.string().min(1).max(128),
  testConfig: TestConfigSchema,
});

const PARTY_TTL_MS = 30 * 60 * 1000; // 30 minutes; spec allows 30–60.
const COLLECTION = "parties_v1";

// ─── Handler ───────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Validate body
  const parsed = await req.json().then(BodySchema.safeParseAsync).catch(() => null);
  if (!parsed || !parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed?.error?.issues ?? null },
      { status: 400 },
    );
  }
  const { hostPlayerId, testConfig } = parsed.data;
  const fullConfig: PartyTestConfig = {
    mode: testConfig.mode,
    wordCount: testConfig.wordCount,
    flags: testConfig.flags,
    language: testConfig.language,
  };

  // 2. Generate shared content
  let content: ReturnType<typeof generatePartyContent>;
  try {
    content = generatePartyContent(fullConfig);
  } catch (e: any) {
    return NextResponse.json(
      { error: "content_generation_failed", detail: String(e?.message ?? e) },
      { status: 500 },
    );
  }

  // 3. Mint a unique code (collision retry against Firestore active set).
  //    Active = the `active` boolean flag, maintained by this route at
  //    creation and (later, in Phase 6) flipped off on finish/expire. This
  //    avoids a composite index on (code, status, expiresAt) for Phase 1.
  let db;
  try {
    db = getAdminDb();
  } catch (e: any) {
    return NextResponse.json(
      { error: "firebase_unavailable", detail: String(e?.message ?? e) },
      { status: 503 },
    );
  }

  let code: string;
  try {
    code = await mintUniqueCode(async (candidate) => {
      const snap = await db
        .collection(COLLECTION)
        .where("code", "==", candidate)
        .where("active", "==", true)
        .limit(1)
        .get();
      return !snap.empty;
    });
  } catch {
    return NextResponse.json({ error: "party_code_pool_exhausted" }, { status: 503 });
  }

  // 4. Compose room state.
  const partyId = randomUUID();
  const now = Date.now();
  const expiresAt = now + PARTY_TTL_MS;

  const roomState: PartyRoomState = {
    protocolVersion: PROTOCOL_VERSION,
    partyId,
    code,
    hostId: hostPlayerId,
    guestId: null,
    status: "waiting",
    testConfig: fullConfig,
    testContent: content.text,
    contentSeed: content.seed,
    readiness: { [hostPlayerId]: false },
    startsAt: null,
    finishedAt: null,
    lastProgress: {},
    lastSeen: { [hostPlayerId]: now },
    roundId: 1,
    results: {},
    winnerId: null,
    rematchReady: {},
    createdAt: now,
    expiresAt,
  };

  // 5. Hydrate PartyKit room. Must succeed before we hand the code back to
  //    the client; otherwise the room would be empty when the host connects.
  try {
    await hydratePartyRoom(roomState);
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    // Distinguish "operator forgot to configure the host" from "PartyKit is
    // down" so deploy dashboards can route the alert correctly. Both still
    // surface as a 502 with the same friendly UI copy.
    const code = msg.startsWith("partykit_host_missing")
      ? "partykit_host_missing"
      : "partykit_hydrate_failed";
    return NextResponse.json(
      { error: code, detail: msg },
      { status: 502 },
    );
  }

  // 6. Audit row in Firestore. Server timestamps used for clocks; the
  //    Date.now() values inside roomState remain the source of truth for
  //    realtime logic (PartyKit clock).
  try {
    await db
      .collection(COLLECTION)
      .doc(partyId)
      .set({
        partyId,
        code,
        hostId: hostPlayerId,
        guestId: null,
        status: "waiting",
        active: true,                   // flipped off on finish/expire (Phase 6)
        testConfig: fullConfig,
        testContent: content.text,
        contentSeed: content.seed,
        createdAt: serverTs(),
        createdAtMs: now,               // mirror of room state for cross-clock joins
        expiresAt: new Date(expiresAt),
        expiresAtMs: expiresAt,
        startedAt: null,
        finishedAt: null,
      }, { merge: false });
  } catch (e: any) {
    // Hydration succeeded but the audit row failed. The room is still
    // usable (PartyKit has the truth) — but lookup-by-code would fail. Best
    // to refuse so the client doesn't get a half-broken party.
    return NextResponse.json(
      { error: "firestore_write_failed", detail: String(e?.message ?? e) },
      { status: 500 },
    );
  }

  const resp: CreatePartyResponse = {
    partyId,
    code,
    partyUrl: `/party/${code}`,
    testContent: content.text,
    expiresAt,
  };
  return NextResponse.json(resp, { status: 200 });
}
