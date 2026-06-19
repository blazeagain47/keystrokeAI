// Shared types between the PartyKit server (party/index.ts) and the Next.js
// client. Keep this file dependency-free so it imports cleanly into both
// runtimes (PartyKit's worker-ish env and the browser/Node bundles).
//
// Identity model (locked in by spec):
//   - partyId : internal UUID, used as the PartyKit room id and Firestore key.
//   - code    : 6-digit zero-padded public join code (string).
//   - playerId: stable per-tab identity, reused from existing bk_guest_id.
//
// Versioning: bump PROTOCOL_VERSION on any breaking shape change so the
// server can reject incompatible clients in a later phase.

export const PROTOCOL_VERSION = 1 as const;

export type PartyRole = "host" | "guest";

export type PartyStatus =
  | "waiting"   // host created, guest not yet joined
  | "ready"    // both players present, not all ready
  | "countdown" // countdown started, startsAt is set
  | "active"   // race in progress
  | "finished" // both finished or time expired
  | "expired"; // TTL passed or canceled

// MVP targets words mode first; time mode follows. Other modes (coder/zen/
// custom) are explicitly out of scope for the MVP.
export type PartyTestMode = "words" | "time";

export interface PartyTestConfig {
  mode: PartyTestMode;
  wordCount?: number;  // required when mode === 'words'
  timeLimit?: number;  // seconds; required when mode === 'time'
  flags: {
    punctuation: boolean;
    numbers: boolean;
  };
  language: string;    // 'english' for MVP
}

// One player's latest progress sample. Sent ~10Hz by the client and
// rebroadcast to the opponent. Includes a per-player monotonic sequence so
// receivers can drop stale frames.
export interface ProgressSample {
  playerId: string;
  sequence: number;
  charIndex: number;          // global cursor index into testContent
  correctChars: number;
  incorrectChars: number;
  wpm: number;
  accuracy: number;
  elapsedMs: number;
  clientTs: number;           // client's performance.now()-ish wall clock
}

export interface FinalResult {
  playerId: string;
  roundId: number;            // which round this result belongs to
  finalWpm: number;
  finalAccuracy: number;
  correctChars: number;
  incorrectChars: number;
  completed: boolean;         // true if reached the end of testContent
  finishTimeMs: number | null; // elapsed ms when the player finished; null if DNF
}

// Authoritative room state held by the PartyKit server. The client receives
// snapshots of this on connect and on resync; it should NOT mutate copies.
export interface PartyRoomState {
  protocolVersion: typeof PROTOCOL_VERSION;
  partyId: string;
  code: string;
  hostId: string;
  guestId: string | null;
  status: PartyStatus;
  testConfig: PartyTestConfig;
  testContent: string;
  contentSeed: string | null;
  readiness: Record<string, boolean>;
  startsAt: number | null;     // server epoch ms when test_started fires
  finishedAt: number | null;
  lastProgress: Record<string, ProgressSample>;
  lastSeen: Record<string, number>;     // playerId -> last heartbeat ms
  // ─── Round / results state (Phase 7) ──────────────────────────────────────
  // `roundId` increments on every rematch. `results` holds the CURRENT round's
  // final results only (reset on rematch). `winnerId` is computed once both
  // results land (or on disconnect-finish). `rematchReady` tracks per-player
  // "play again" readiness; cleared when a new round starts.
  roundId: number;
  results: Record<string, FinalResult>;
  winnerId: string | null;
  rematchReady: Record<string, boolean>;
  createdAt: number;
  expiresAt: number;
}

// ─── Wire protocol ──────────────────────────────────────────────────────────

export type ClientToServer =
  | {
      type: "hello";
      protocolVersion: number;
      playerId: string;
      role?: PartyRole;         // host hints on first connect; server validates
      clientTs: number;
    }
  | {
      type: "set_ready";
      playerId: string;
      ready: boolean;
      clientTs: number;
    }
  | {
      type: "request_start";    // host-only; server enforces
      playerId: string;
      clientTs: number;
    }
  | {
      type: "progress";
      playerId: string;
      sequence: number;
      charIndex: number;
      correctChars: number;
      incorrectChars: number;
      wpm: number;
      accuracy: number;
      elapsedMs: number;
      clientTs: number;
    }
  | {
      type: "finish";
      playerId: string;
      roundId: number;
      finalWpm: number;
      finalAccuracy: number;
      correctChars: number;
      incorrectChars: number;
      finishTimeMs: number | null;
      completed: boolean;
      clientTs: number;
    }
  | {
      type: "rematch_ready";
      playerId: string;
      roundId: number;           // round the player just finished; server validates
      ready: boolean;
      clientTs: number;
    }
  | {
      type: "heartbeat";
      playerId: string;
      clientTs: number;
    }
  | {
      type: "leave";
      playerId: string;
      clientTs: number;
    };

export type ServerToClient =
  | {
      type: "hello_ack";
      partyId: string;
      serverTs: number;
      note?: string;
    }
  | {
      type: "state_snapshot";
      state: PartyRoomState;
      serverTs: number;
    }
  | {
      type: "player_joined";
      playerId: string;
      role: PartyRole;
      serverTs: number;
    }
  | {
      type: "player_left";
      playerId: string;
      serverTs: number;
    }
  | {
      type: "ready_state_changed";
      playerId: string;
      ready: boolean;
      serverTs: number;
    }
  | {
      type: "countdown_started";
      startsAt: number;
      serverTs: number;
    }
  | {
      type: "test_started";
      startsAt: number;
      serverTs: number;
    }
  | {
      type: "progress_relay";
      progress: ProgressSample;
      serverTs: number;
    }
  | {
      type: "player_finished";
      result: FinalResult;
      serverTs: number;
    }
  | {
      type: "party_finished";
      roundId: number;
      winnerId: string | null;       // null on tie or both-disconnected
      results: FinalResult[];
      serverTs: number;
    }
  | {
      type: "rematch_ready_changed";
      playerId: string;
      ready: boolean;
      serverTs: number;
    }
  | {
      type: "next_test_started";
      roundId: number;
      testContent: string;
      testConfig: PartyTestConfig;
      serverTs: number;
    }
  | {
      type: "opponent_disconnected";
      playerId: string;
      sinceMs: number;
      serverTs: number;
    }
  | {
      type: "opponent_reconnected";
      playerId: string;
      serverTs: number;
    }
  | {
      type: "echo";                  // Phase 0 only; removed in Phase 3
      received: ClientToServer;
      serverTs: number;
    }
  | {
      type: "error";
      code: string;
      message: string;
      serverTs: number;
    };

// Minimal payload shapes for the Next.js API routes that flank PartyKit.
// Defined here so client and server agree without circular imports.

export interface CreatePartyRequest {
  hostPlayerId: string;
  testConfig: PartyTestConfig;
}

export interface CreatePartyResponse {
  partyId: string;
  code: string;
  partyUrl: string;              // /party/<code>
  testContent: string;
  expiresAt: number;
}

export interface JoinPartyRequest {
  code: string;
  guestPlayerId: string;
}

export interface JoinPartyResponse {
  partyId: string;
  code: string;
  testConfig: PartyTestConfig;
  testContent: string;
  hostId: string;
  status: PartyStatus;
  expiresAt: number;
}
