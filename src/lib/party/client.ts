// Thin browser-side wrapper around `partysocket` for the blazeKey party
// feature. Phase 0 scope:
//   - resolve the PartyKit host from NEXT_PUBLIC_PARTYKIT_HOST,
//   - expose a typed `connect(partyId, playerId)` that returns a small client
//     with `send`, `onMessage`, `disconnect`,
//   - DO NOT attach to TypingBox yet (no engine coupling in Phase 0).
//
// Higher-level orchestration (Zustand store, reconnect, snapshot reconciliation)
// lands in Phase 2/3 once the UI exists to drive it.

import PartySocket from "partysocket";

import type { ClientToServer, ServerToClient } from "./types";

const PARTY_NAME = "main" as const; // matches party/index.ts default export.

let warnedNoHost = false;

function getPartyHost(): string {
  const fromEnv = process.env.NEXT_PUBLIC_PARTYKIT_HOST;
  if (typeof fromEnv === "string" && fromEnv.length > 0) return fromEnv;
  // Dev fallback: `npx partykit dev` listens on :1999 by default. In
  // production this fallback will never resolve from a deployed origin, so
  // we surface a one-time console warning to make the misconfig obvious.
  if (
    process.env.NODE_ENV === "production" &&
    typeof window !== "undefined" &&
    !warnedNoHost
  ) {
    warnedNoHost = true;
    // eslint-disable-next-line no-console
    console.warn(
      "[blazeKey/party] NEXT_PUBLIC_PARTYKIT_HOST is not set. Multiplayer will not work in this deployment.",
    );
  }
  return "127.0.0.1:1999";
}

export interface PartyClientHandle {
  /** Internal partyId == PartyKit room id. NOT the 6-digit public code. */
  readonly partyId: string;
  /** Caller's playerId (from getOrCreatePlayerId). */
  readonly playerId: string;
  /** Send a typed message. Silently drops if the socket isn't open yet. */
  send: (msg: ClientToServer) => void;
  /** Subscribe to server messages. Returns an unsubscribe fn. */
  onMessage: (handler: (msg: ServerToClient) => void) => () => void;
  /** Subscribe to socket open events (incl. reconnects). Returns an unsubscribe fn. */
  onOpen: (handler: () => void) => () => void;
  /** Subscribe to socket close events. Returns an unsubscribe fn. */
  onClose: (handler: (info: { code: number; reason: string }) => void) => () => void;
  /** Close the socket and release listeners. */
  disconnect: () => void;
  /** True if the underlying socket reports OPEN. */
  isOpen: () => boolean;
}

/**
 * Open a WebSocket to the PartyKit room for `partyId`. The caller is
 * responsible for sending the initial `hello` message after subscribing.
 *
 * IMPORTANT: `partyId` is the INTERNAL uuid, not the 6-digit public code.
 * Routes that take a public code (e.g. /api/party/join) must resolve
 * code -> partyId before calling this.
 */
export function connectToParty(
  partyId: string,
  playerId: string,
): PartyClientHandle {
  if (typeof window === "undefined") {
    throw new Error("connectToParty() must only run in the browser");
  }
  if (!partyId || typeof partyId !== "string") {
    throw new Error("connectToParty(): partyId is required");
  }
  if (!playerId || typeof playerId !== "string") {
    throw new Error("connectToParty(): playerId is required");
  }

  const socket = new PartySocket({
    host: getPartyHost(),
    party: PARTY_NAME,
    room: partyId,
    // Include playerId as a query param so the server has it before the
    // first message (useful for logging on socket-error paths).
    query: { playerId },
  });

  const messageHandlers = new Set<(msg: ServerToClient) => void>();
  const openHandlers = new Set<() => void>();
  const closeHandlers = new Set<(info: { code: number; reason: string }) => void>();

  socket.addEventListener("message", (event: MessageEvent) => {
    let parsed: ServerToClient | null = null;
    try {
      parsed = JSON.parse(String(event.data)) as ServerToClient;
    } catch {
      return;
    }
    for (const h of messageHandlers) {
      try {
        h(parsed);
      } catch {
        // never let one bad handler break the others
      }
    }
  });

  socket.addEventListener("open", () => {
    for (const h of openHandlers) {
      try {
        h();
      } catch {}
    }
  });

  socket.addEventListener("close", (event: CloseEvent) => {
    const info = { code: event.code, reason: event.reason };
    for (const h of closeHandlers) {
      try {
        h(info);
      } catch {}
    }
  });

  return {
    partyId,
    playerId,
    send: (msg) => {
      try {
        socket.send(JSON.stringify(msg));
      } catch {
        // partysocket buffers while CONNECTING; failures here just drop.
      }
    },
    onMessage: (handler) => {
      messageHandlers.add(handler);
      return () => {
        messageHandlers.delete(handler);
      };
    },
    onOpen: (handler) => {
      openHandlers.add(handler);
      return () => {
        openHandlers.delete(handler);
      };
    },
    onClose: (handler) => {
      closeHandlers.add(handler);
      return () => {
        closeHandlers.delete(handler);
      };
    },
    disconnect: () => {
      messageHandlers.clear();
      openHandlers.clear();
      closeHandlers.clear();
      try {
        socket.close();
      } catch {}
    },
    isOpen: () => socket.readyState === 1, // WebSocket.OPEN
  };
}

// Re-export for convenience so call sites can `import { connectToParty, getPartyHost }`
export { getPartyHost };
