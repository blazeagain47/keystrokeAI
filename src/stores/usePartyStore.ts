// Isolated Zustand store for the party feature. Solo typing never observes
// this store and party code never observes solo state.
//
// Phase 3 adds a `live` slice that mirrors the PartyKit room broadcast
// (membership presence, readiness, startsAt, connection status). The
// authoritative truth lives in PartyKit; `live` is a denormalized client
// cache that the lobby reads from.

import { create } from "zustand";

import type {
  FinalResult,
  PartyRole,
  PartyRoomState,
  PartyStatus,
  PartyTestConfig,
  ProgressSample,
} from "@/lib/party/types";

interface PartyStateData {
  partyId: string;
  code: string;
  role: PartyRole;
  status: PartyStatus;
  hostId: string;
  guestId: string | null;
  testConfig: PartyTestConfig;
  testContent: string;
  roundId: number;
  expiresAt: number;
}

/**
 * Per-opponent progress slice. We store the latest accepted sample plus
 * the wall-clock arrival time of that sample so the debug HUD can show
 * staleness (e.g. "last update 1.2s ago"). The `sequence` on `sample` is
 * also used as the monotonic guard for incoming progress_relay events.
 */
export interface OpponentProgressEntry {
  sample: ProgressSample;
  /** Local Date.now() when this sample was applied. */
  receivedAt: number;
}

interface LiveSlice {
  /** Presence: which playerIds currently have an open socket per latest snapshot/event. */
  members: Record<string, true>;
  /** Latest known readiness map from server (mirrors PartyRoomState.readiness). */
  readiness: Record<string, boolean>;
  /** When the test will start (server epoch ms), or null. */
  startsAt: number | null;
  /** Is the local WebSocket currently OPEN? */
  connected: boolean;
  /**
   * True only once PartyKit has ACCEPTED this socket — i.e. a state_snapshot
   * arrived confirming the local playerId holds the host or guest seat on the
   * server. A rejected third browser (party_full / player_already_connected)
   * is closed BEFORE any snapshot is broadcast, so it never flips this true
   * and therefore can never mount the race / results / countdown screens.
   * Sticky-true within a session; reset only on hard rejection or leave so a
   * transient mid-race reconnect blip doesn't tear down the typing engine.
   */
  roomAccepted: boolean;
  /** Latest progress per opponent playerId. Only contains non-self entries. */
  opponentProgress: Record<string, OpponentProgressEntry>;
  /**
   * Set when the server reports the opponent has gone dark (heartbeat
   * timeout or socket close) during an active race. Cleared on reconnect
   * or race teardown. Used to render a non-fatal banner without
   * tearing down the typing engine.
   */
  opponentDisconnected: boolean;
  /**
   * Final results for the CURRENT round, keyed by playerId. Populated by
   * `player_finished`, `party_finished`, snapshots, and the local
   * optimistic `markSelfFinished`. Reset when a new round starts.
   */
  results: Record<string, FinalResult>;
  /** Winner of the current round (null = tie / undecided). */
  winnerId: string | null;
  /** Per-player "play again" readiness for the current finished round. */
  rematchReady: Record<string, boolean>;
}

interface PartyStore {
  party: PartyStateData | null;
  live: LiveSlice;
  loading: boolean;
  error: string | null;

  setFromCreate: (input: {
    partyId: string;
    code: string;
    hostId: string;
    testConfig: PartyTestConfig;
    testContent: string;
    expiresAt: number;
  }) => void;

  setFromJoin: (input: {
    partyId: string;
    code: string;
    hostId: string;
    status: PartyStatus;
    testConfig: PartyTestConfig;
    testContent: string;
    expiresAt: number;
  }) => void;

  /** Apply a full server state_snapshot. The local playerId derives role. */
  applySnapshot: (snap: PartyRoomState, localPlayerId: string) => void;

  /** Mark a remote player as present (e.g. on `player_joined`). */
  markPlayerJoined: (playerId: string, role?: PartyRole) => void;
  /** Mark a player as gone (e.g. on `player_left`). */
  markPlayerLeft: (playerId: string) => void;
  /** Local mirror of a `ready_state_changed` event. */
  setReadyFor: (playerId: string, ready: boolean) => void;
  /** Apply a `countdown_started` event. */
  applyCountdownStarted: (startsAt: number) => void;
  /** Apply a `test_started` event. */
  applyTestStarted: () => void;
  /** Track local socket connection status. */
  setConnected: (connected: boolean) => void;
  /** Set/reset the "this socket was accepted by PartyKit" gate. */
  setRoomAccepted: (accepted: boolean) => void;
  /**
   * Apply a `progress_relay` event for an opponent. Stale or duplicate
   * sequence numbers are silently ignored — older frames will never
   * overwrite newer ones in the HUD.
   */
  applyProgressRelay: (sample: ProgressSample) => void;
  /** Clear opponent progress (e.g. on race restart or unmount). */
  clearOpponentProgress: () => void;
  /** Track opponent presence drops/recoveries for the in-race banner. */
  setOpponentDisconnected: (down: boolean) => void;

  /** Optimistically record the local player's final result on completion. */
  markSelfFinished: (result: FinalResult) => void;
  /** Apply a `player_finished` event (one player's result landed). */
  applyPlayerFinished: (result: FinalResult) => void;
  /** Apply a `party_finished` event (round closed; full results + winner). */
  applyPartyFinished: (input: {
    roundId: number;
    winnerId: string | null;
    results: FinalResult[];
  }) => void;
  /** Apply a `rematch_ready_changed` event. */
  applyRematchReadyChanged: (playerId: string, ready: boolean) => void;
  /** Apply a `next_test_started` event (new round content + reset). */
  applyNextTestStarted: (input: {
    roundId: number;
    testContent: string;
    testConfig: PartyTestConfig;
  }) => void;

  setStatus: (status: PartyStatus) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

const emptyLive: LiveSlice = {
  members: {},
  readiness: {},
  startsAt: null,
  connected: false,
  roomAccepted: false,
  opponentProgress: {},
  opponentDisconnected: false,
  results: {},
  winnerId: null,
  rematchReady: {},
};

export const usePartyStore = create<PartyStore>((set) => ({
  party: null,
  live: emptyLive,
  loading: false,
  error: null,

  setFromCreate: ({ partyId, code, hostId, testConfig, testContent, expiresAt }) =>
    set({
      party: {
        partyId,
        code,
        role: "host",
        status: "waiting",
        hostId,
        guestId: null,
        testConfig,
        testContent,
        roundId: 1,
        expiresAt,
      },
      live: {
        members: { [hostId]: true },
        readiness: { [hostId]: false },
        startsAt: null,
        connected: false,
        roomAccepted: false,
        opponentProgress: {},
        opponentDisconnected: false,
        results: {},
        winnerId: null,
        rematchReady: {},
      },
      error: null,
      loading: false,
    }),

  setFromJoin: ({ partyId, code, hostId, status, testConfig, testContent, expiresAt }) =>
    set((s) => {
      const role: PartyRole =
        s.party?.partyId === partyId && s.party?.role === "host" ? "host" : "guest";
      return {
        party: {
          partyId,
          code,
          role,
          status,
          hostId,
          guestId: s.party?.guestId ?? null,
          testConfig,
          testContent,
          roundId: s.party?.roundId ?? 1,
          expiresAt,
        },
        // Do not clobber `live` here — it gets populated by the snapshot
        // that arrives over WebSocket. Just ensure it exists.
        live: s.live ?? emptyLive,
        error: null,
        loading: false,
      };
    }),

  applySnapshot: (snap, localPlayerId) =>
    set((s) => {
      const role: PartyRole = snap.hostId === localPlayerId ? "host" : "guest";
      // Seed opponentProgress from snap.lastProgress, skipping self. Merge
      // with the existing live cache so a snapshot arriving between
      // progress_relay frames doesn't rewind to older data — keep whichever
      // sequence is higher.
      const opponentProgress: Record<string, OpponentProgressEntry> = {};
      const existing = s.live?.opponentProgress ?? {};
      const now = Date.now();
      for (const [pid, sample] of Object.entries(snap.lastProgress ?? {})) {
        if (pid === localPlayerId) continue;
        const prior = existing[pid];
        if (prior && prior.sample.sequence >= sample.sequence) {
          opponentProgress[pid] = prior;
        } else {
          opponentProgress[pid] = { sample, receivedAt: now };
        }
      }
      return {
        party: {
          partyId: snap.partyId,
          code: snap.code,
          role,
          status: snap.status,
          hostId: snap.hostId,
          guestId: snap.guestId,
          testConfig: snap.testConfig,
          testContent: snap.testContent,
          roundId: snap.roundId ?? 1,
          expiresAt: snap.expiresAt,
        },
        live: {
          members: deriveMembers(snap),
          readiness: { ...snap.readiness },
          startsAt: snap.startsAt,
          connected: true,
          // Receiving a snapshot at all means PartyKit accepted this socket.
          // Confirm the local player actually holds a seat, and keep the flag
          // sticky-true so a later snapshot can't flip it off mid-race.
          roomAccepted:
            (s.live?.roomAccepted ?? false) ||
            snap.hostId === localPlayerId ||
            snap.guestId === localPlayerId,
          opponentProgress,
          // A fresh snapshot means presence we previously thought was
          // dropped may now be back. Don't clobber a "still down" state
          // here — only clear it if the opponent is back in members.
          opponentDisconnected:
            s.live?.opponentDisconnected && !isOpponentPresent(snap, localPlayerId)
              ? true
              : false,
          results: { ...(snap.results ?? {}) },
          winnerId: snap.winnerId ?? null,
          rematchReady: { ...(snap.rematchReady ?? {}) },
        },
      };
    }),

  markPlayerJoined: (playerId, role) =>
    set((s) => ({
      // If role is "guest", also update party.guestId so the Guest card
      // becomes "Connected" immediately without waiting for the snapshot.
      party:
        s.party && role === "guest"
          ? { ...s.party, guestId: playerId }
          : s.party,
      live: { ...s.live, members: { ...s.live.members, [playerId]: true } },
    })),

  markPlayerLeft: (playerId) =>
    set((s) => {
      const nextMembers = { ...s.live.members };
      delete nextMembers[playerId];
      // If the leaving player holds the guest slot, clear it so the Guest
      // card reverts to "Waiting" without waiting for the snapshot.
      const isGuest = s.party?.guestId === playerId;
      return {
        party: s.party && isGuest ? { ...s.party, guestId: null } : s.party,
        live: { ...s.live, members: nextMembers },
      };
    }),

  setReadyFor: (playerId, ready) =>
    set((s) => ({
      live: {
        ...s.live,
        readiness: { ...s.live.readiness, [playerId]: ready },
      },
    })),

  applyCountdownStarted: (startsAt) =>
    set((s) => ({
      party: s.party ? { ...s.party, status: "countdown" } : null,
      live: { ...s.live, startsAt },
    })),

  applyTestStarted: () =>
    set((s) => ({
      party: s.party ? { ...s.party, status: "active" } : null,
    })),

  setConnected: (connected) =>
    set((s) => ({ live: { ...s.live, connected } })),

  setRoomAccepted: (accepted) =>
    set((s) => ({ live: { ...s.live, roomAccepted: accepted } })),

  applyProgressRelay: (sample) =>
    set((s) => {
      const existing = s.live.opponentProgress[sample.playerId];
      // Monotonic guard: never apply a same-or-older sequence. The server
      // already drops these, but the client also enforces in case a buggy
      // peer or a reordered packet slips through.
      if (existing && sample.sequence <= existing.sample.sequence) {
        return {};
      }
      return {
        live: {
          ...s.live,
          opponentProgress: {
            ...s.live.opponentProgress,
            [sample.playerId]: { sample, receivedAt: Date.now() },
          },
        },
      };
    }),

  clearOpponentProgress: () =>
    set((s) => ({ live: { ...s.live, opponentProgress: {} } })),

  setOpponentDisconnected: (down) =>
    set((s) => ({ live: { ...s.live, opponentDisconnected: down } })),

  markSelfFinished: (result) =>
    set((s) => {
      // Ignore stale results from a previous round.
      if (s.party && result.roundId !== s.party.roundId) return {};
      if (s.live.results[result.playerId]) return {};
      return {
        live: {
          ...s.live,
          results: { ...s.live.results, [result.playerId]: result },
        },
      };
    }),

  applyPlayerFinished: (result) =>
    set((s) => {
      if (s.party && result.roundId !== s.party.roundId) return {};
      if (s.live.results[result.playerId]) return {};
      return {
        live: {
          ...s.live,
          results: { ...s.live.results, [result.playerId]: result },
        },
      };
    }),

  applyPartyFinished: ({ roundId, winnerId, results }) =>
    set((s) => {
      const map: Record<string, FinalResult> = { ...s.live.results };
      for (const r of results) map[r.playerId] = r;
      return {
        party: s.party ? { ...s.party, status: "finished", roundId } : null,
        live: { ...s.live, results: map, winnerId },
      };
    }),

  applyRematchReadyChanged: (playerId, ready) =>
    set((s) => ({
      live: {
        ...s.live,
        rematchReady: { ...s.live.rematchReady, [playerId]: ready },
      },
    })),

  applyNextTestStarted: ({ roundId, testContent, testConfig }) =>
    set((s) => ({
      party: s.party
        ? {
            ...s.party,
            // Optimistically enter countdown so the UI doesn't flash the
            // lobby between next_test_started and countdown_started.
            status: "countdown",
            roundId,
            testContent,
            testConfig,
          }
        : null,
      live: {
        ...s.live,
        // Fresh round: wipe all per-round state. Set an optimistic countdown
        // target so the countdown screen renders immediately; the authoritative
        // countdown_started that follows corrects startsAt.
        startsAt: Date.now() + 3000,
        opponentProgress: {},
        opponentDisconnected: false,
        results: {},
        winnerId: null,
        rematchReady: {},
      },
    })),

  setStatus: (status) =>
    set((s) => (s.party ? { party: { ...s.party, status } } : {})),

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  clear: () => set({ party: null, live: emptyLive, error: null, loading: false }),
}));

// Slot-based presence: a player is considered a member if and only if
// they currently hold a slot in the room (hostId or guestId). The server
// clears guestId on disconnect, so a null guestId reliably means no guest.
// This is immune to clock-skew issues with time-based lastSeen comparisons.
function deriveMembers(snap: PartyRoomState): Record<string, true> {
  const out: Record<string, true> = {};
  if (snap.hostId) out[snap.hostId] = true;
  if (snap.guestId) out[snap.guestId] = true;
  return out;
}

function isOpponentPresent(snap: PartyRoomState, localPlayerId: string): boolean {
  if (snap.hostId === localPlayerId) return snap.guestId != null;
  return snap.hostId != null && snap.hostId !== localPlayerId;
}
