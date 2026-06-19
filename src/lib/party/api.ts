// Client-side fetchers for the /api/party/* routes. Tiny + typed so the
// UI components don't hand-roll fetch options or error parsing.
//
// IMPORTANT: This module is browser-safe. It does NOT import server-only
// helpers (firebaseAdmin, node:crypto, serverConfig). Anything that the
// browser shouldn't see must stay in src/lib/party/serverConfig.ts.

import type {
  CreatePartyResponse,
  JoinPartyResponse,
  PartyTestConfig,
} from "./types";

/** Subset of test config the Create form actually owns in Phase 2. */
export interface CreatePartyOptions {
  hostPlayerId: string;
  testConfig: PartyTestConfig;
}

/** Typed error so the UI can map error codes → friendly copy. */
export class PartyApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail: unknown;
  constructor(status: number, code: string, message: string, detail?: unknown) {
    super(message);
    this.name = "PartyApiError";
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

async function parseError(res: Response): Promise<PartyApiError> {
  let payload: any = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }
  const code = String(payload?.error ?? `http_${res.status}`);
  const detail = payload?.detail ?? payload?.issues ?? null;
  const message = friendlyMessage(code, detail);
  return new PartyApiError(res.status, code, message, detail);
}

function friendlyMessage(code: string, _detail: unknown): string {
  switch (code) {
    case "invalid_body":
    case "invalid_code_shape":
      return "That doesn't look like a valid party code.";
    case "party_not_found":
      return "No party with that code. Double-check and try again.";
    case "party_expired":
      return "This party has expired. Ask your friend to create a new one.";
    case "party_full":
      return "This party already has two players.";
    case "player_already_connected":
      return "This party is already open in another tab.";
    case "party_not_joinable":
      return "This party has already started or is no longer joinable.";
    case "partykit_unavailable":
      return "Couldn't reach the multiplayer server to verify the room. Try again in a moment.";
    case "firebase_unavailable":
      return "Server is misconfigured (Firebase). Try again later.";
    case "partykit_hydrate_failed":
      return "Couldn't reach the multiplayer server. Try again in a moment.";
    case "partykit_host_missing":
      return "Multiplayer isn't configured on this deployment. Please report this.";
    case "party_code_pool_exhausted":
      return "Couldn't find an unused code. Please try again.";
    case "content_generation_failed":
      return "Couldn't prepare a test. Try a different word count.";
    case "firestore_query_failed":
    case "firestore_write_failed":
      return "Database error. Please try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export async function createParty(opts: CreatePartyOptions): Promise<CreatePartyResponse> {
  const res = await fetch("/api/party/create", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(opts),
    cache: "no-store",
  });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as CreatePartyResponse;
}

export async function joinParty(input: {
  code: string;
  guestPlayerId: string;
}): Promise<JoinPartyResponse> {
  const res = await fetch("/api/party/join", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as JoinPartyResponse;
}

/**
 * Trigger a rematch (next round) for an existing party. The server route
 * generates fresh content and pushes it to the PartyKit room using the
 * server-only admin token — the browser never sees that token. Only a
 * verified host/guest of the party may call this successfully.
 */
export async function requestRematch(input: {
  partyId: string;
  playerId: string;
}): Promise<{ ok: boolean; roundId?: number }> {
  const res = await fetch("/api/party/rematch", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as { ok: boolean; roundId?: number };
}
