// Server-only helpers for talking to the PartyKit room from Next.js API
// routes. Importing this file from the browser will fail at runtime because
// it references server-only env vars and uses Node fetch with secret
// headers; keep it under /api/* only.

import type { PartyRoomState, PartyStatus } from "./types";

const DEFAULT_DEV_HOST = "127.0.0.1:1999";
const PARTY_NAME = "main";

/**
 * Resolve the PartyKit host the SERVER should talk to. In production this
 * is the deployed *.partykit.dev host. In local dev it falls back to
 * `127.0.0.1:1999`, matching `npx partykit dev`'s default port.
 *
 * Distinct from the client's `getPartyHost()` because (a) the server may
 * speak HTTP not WSS, and (b) we want to allow a server-only override
 * (PARTYKIT_HOST) without exposing it via NEXT_PUBLIC.
 *
 * Production safety: if NODE_ENV === "production" and neither PARTYKIT_HOST
 * nor NEXT_PUBLIC_PARTYKIT_HOST is set, this throws instead of silently
 * falling back to `127.0.0.1:1999` (which would never resolve from a Vercel
 * function). Callers should map that to a 502 in the API route.
 */
export function getServerPartyHost(): string {
  const serverOverride = process.env.PARTYKIT_HOST;
  if (typeof serverOverride === "string" && serverOverride.length > 0) {
    return serverOverride;
  }
  const publicHost = process.env.NEXT_PUBLIC_PARTYKIT_HOST;
  if (typeof publicHost === "string" && publicHost.length > 0) {
    return publicHost;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "partykit_host_missing: set PARTYKIT_HOST (preferred) or NEXT_PUBLIC_PARTYKIT_HOST on the server in production",
    );
  }
  return DEFAULT_DEV_HOST;
}

/** HTTP URL of a room's PartyKit endpoint (for server-to-server fetch). */
export function getRoomHttpUrl(partyId: string): string {
  const host = getServerPartyHost();
  const scheme = host.startsWith("127.0.0.1") || host.startsWith("localhost")
    ? "http"
    : "https";
  return `${scheme}://${host}/parties/${PARTY_NAME}/${encodeURIComponent(partyId)}`;
}

function getAdminToken(): string {
  const t = process.env.PARTYKIT_ADMIN_TOKEN;
  if (typeof t !== "string" || t.length < 8) {
    throw new Error("PARTYKIT_ADMIN_TOKEN_missing_or_weak");
  }
  return t;
}

/**
 * Hydrate a brand-new room with its initial authoritative state. Idempotent
 * on the PartyKit side (same partyId returns the same room). Throws on
 * non-2xx so the create route can refuse to return a code that doesn't
 * have a backing room.
 */
export async function hydratePartyRoom(state: PartyRoomState): Promise<void> {
  const url = getRoomHttpUrl(state.partyId);
  const token = getAdminToken();

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      "x-bk-party-op": "hydrate",
    },
    body: JSON.stringify({ op: "hydrate", state }),
    // PartyKit room HTTP is fast (≤ a few hundred ms); fail loud if not.
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`partykit_hydrate_failed_${res.status}:${text.slice(0, 200)}`);
  }
}

/**
 * Optional: ask the room whether a given code is already in use. Phase 1
 * delegates uniqueness to Firestore, so this is a fast-path nice-to-have,
 * NOT the source of truth. Kept here for symmetry; create-route does not
 * call it yet.
 */
export async function pingRoom(partyId: string): Promise<boolean> {
  try {
    const res = await fetch(getRoomHttpUrl(partyId), {
      method: "GET",
      headers: { authorization: `Bearer ${getAdminToken()}` },
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export interface RoomSummary {
  partyId: string;
  code: string;
  status: PartyStatus;
  hostId: string;
  guestId: string | null;
  expiresAt: number;
}

/**
 * Fetch the live capacity summary for a PartyKit room. This is the
 * authoritative source for hostId / guestId / status — Firestore is
 * never updated with those live values after creation.
 *
 * Returns null on any failure (network error, room not found, bad shape).
 * Callers that need capacity enforcement should treat null as "cannot
 * verify" and FAIL CLOSED — do not let an unverified third player in.
 *
 * The GET endpoint on the PartyKit room is unauthenticated. We send the
 * admin token anyway for consistency; if the token isn't configured we
 * proceed without it because GET is still safe.
 */
export async function getRoomSummary(partyId: string): Promise<RoomSummary | null> {
  const headers: Record<string, string> = {};
  try {
    headers["authorization"] = `Bearer ${getAdminToken()}`;
  } catch {
    // Token not configured — GET is public on the room server.
  }
  try {
    const res = await fetch(getRoomHttpUrl(partyId), {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    if (!data.ok) return null;
    return {
      partyId: String(data.partyId ?? ""),
      code: String(data.code ?? ""),
      status: ((data.status ?? "waiting") as PartyStatus),
      hostId: String(data.hostId ?? ""),
      guestId: data.guestId != null ? String(data.guestId) : null,
      expiresAt: Number(data.expiresAt ?? 0),
    };
  } catch {
    return null;
  }
}
