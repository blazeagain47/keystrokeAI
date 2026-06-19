// PartyKit server for blazeKey 1v1 parties.
//
// Phase 3 scope:
//   - Real lobby state machine: claim host/guest slots, presence,
//     ready toggles, server-authoritative countdown, transition to active.
//   - State persisted in room.storage so hibernation is safe.
//   - Admin-gated POST hydration from Phase 1 still works.
//   - WebSocket protocol matches `src/lib/party/types.ts` exactly.
//
// Phase 4 adds live progress sync: clients send throttled `progress` events
// during an active race; the server validates and broadcasts a
// `progress_relay` to the opponent only. Stale frames are dropped using a
// per-player monotonic `sequence`. `finish` and results persistence still
// land in Phase 6.
//
// Identity model (still locked):
//   room id == internal `partyId`. The 6-digit `code` is in state but is
//   NOT a room id. /api/party/join translates code -> partyId before any
//   client connects here.

import type * as Party from "partykit/server";

import type {
  ClientToServer,
  FinalResult,
  PartyRole,
  PartyRoomState,
  PartyStatus,
  ServerToClient,
} from "../src/lib/party/types";

const STORAGE_KEY_STATE = "bk:state:v1";
const COUNTDOWN_MS = 3000;

interface HydrateBody {
  op: "hydrate";
  state: PartyRoomState;
}

interface NextRoundBody {
  op: "next_round";
  fromRoundId: number;
  testContent: string;
  contentSeed?: string | null;
}

export default class BlazeKeyParty implements Party.Server {
  static options: Party.ServerOptions = { hibernate: true };

  private state: PartyRoomState | null = null;
  // playerId -> connectionId. Used to enforce one-connection-per-player and
  // to broadcast role-targeted messages without iterating all conns.
  private connByPlayer = new Map<string, string>();
  // Active setTimeout for test_started. Cleared on cancel.
  private countdownTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(readonly room: Party.Room) {}

  // Tag each connection with its playerId so we can find connections by
  // player and enforce single-tab membership. Tag value is sourced from the
  // URL query string set by the client in src/lib/party/client.ts.
  static getConnectionTags(
    _conn: Party.Connection,
    ctx: Party.ConnectionContext,
  ): string[] {
    try {
      const url = new URL((ctx.request as { url: string }).url);
      const pid = url.searchParams.get("playerId");
      return pid ? [`pid:${pid}`] : [];
    } catch {
      return [];
    }
  }

  async onStart() {
    try {
      const persisted = await this.room.storage.get<PartyRoomState>(
        STORAGE_KEY_STATE,
      );
      if (persisted) this.state = normalizeState(persisted);
    } catch {
      this.state = null;
    }
  }

  // ─── HTTP control plane (Phase 1 hydration; unchanged shape) ──────────────

  async onRequest(req: Party.Request): Promise<Response> {
    if (req.method === "GET") return this.handleGet();
    if (req.method === "POST") return this.handlePost(req);
    return new Response("Method Not Allowed", { status: 405 });
  }

  // POST is overloaded: `hydrate` seals a brand-new room (Phase 1) and
  // `next_round` advances an existing room to a fresh rematch round (Phase 7).
  // Both are admin-gated; the public 6-digit code never reaches here.
  private async handlePost(req: Party.Request): Promise<Response> {
    if (!this.isAdminAuthorized(req)) {
      return jsonResponse(401, { ok: false, error: "unauthorized" });
    }
    let body: { op?: string } | null = null;
    try {
      body = (await req.json()) as { op?: string };
    } catch {
      return jsonResponse(400, { ok: false, error: "bad_json" });
    }
    if (!body || typeof body.op !== "string") {
      return jsonResponse(400, { ok: false, error: "unknown_op" });
    }
    if (body.op === "hydrate") {
      return this.handleHydrate(body as unknown as HydrateBody);
    }
    if (body.op === "next_round") {
      return this.handleNextRound(body as unknown as NextRoundBody);
    }
    return jsonResponse(400, { ok: false, error: "unknown_op" });
  }

  private async handleGet(): Promise<Response> {
    const s = await this.getState();
    if (!s) {
      return jsonResponse(404, {
        ok: false,
        partyId: this.room.id,
        hasState: false,
      });
    }
    const liveConns = this.liveConnectionInfo(s);
    return jsonResponse(200, {
      ok: true,
      partyId: this.room.id,
      code: s.code,
      status: s.status,
      hostId: s.hostId,
      guestId: s.guestId,
      roundId: s.roundId,
      expiresAt: s.expiresAt,
      createdAt: s.createdAt,
      // Safe live-connection info for capacity enforcement in /api/party/join.
      // Deliberately excludes testContent and any per-player progress.
      activePlayerIds: liveConns.activePlayerIds,
      activeConnectionCount: liveConns.activeConnectionCount,
      hostConnected: liveConns.hostConnected,
      guestConnected: liveConns.guestConnected,
    });
  }

  private async handleHydrate(body: HydrateBody): Promise<Response> {
    if (!body || !body.state) {
      return jsonResponse(400, { ok: false, error: "unknown_op" });
    }
    const incoming = normalizeState(body.state);
    if (incoming.partyId !== this.room.id) {
      return jsonResponse(400, {
        ok: false,
        error: "party_id_mismatch",
        expected: this.room.id,
        got: incoming.partyId,
      });
    }
    const existing = await this.getState();
    if (existing) {
      if (existing.code === incoming.code) {
        return jsonResponse(200, { ok: true, alreadyHydrated: true });
      }
      return jsonResponse(409, {
        ok: false,
        error: "already_hydrated_different_code",
      });
    }
    this.state = incoming;
    await this.persist();
    try {
      await this.room.storage.setAlarm(incoming.expiresAt);
    } catch {}
    return jsonResponse(200, { ok: true, hydrated: true });
  }

  // Advance a finished room into a fresh rematch round. Called by the
  // server-side /api/party/rematch route AFTER both players signalled
  // rematch readiness. Generates nothing itself — the route supplies the
  // freshly generated testContent so the PartyKit worker stays free of the
  // Next.js prompt generator. Idempotent against double-calls via fromRoundId.
  private async handleNextRound(body: NextRoundBody): Promise<Response> {
    const state = await this.getState();
    if (!state) return jsonResponse(404, { ok: false, error: "no_state" });

    if (typeof body.testContent !== "string" || body.testContent.length === 0) {
      return jsonResponse(400, { ok: false, error: "missing_test_content" });
    }
    // Only a finished round can be advanced.
    if (state.status !== "finished") {
      // If we've already advanced past the requested round, treat as success
      // so a duplicate call doesn't error the client.
      if (typeof body.fromRoundId === "number" && body.fromRoundId < state.roundId) {
        return jsonResponse(200, { ok: true, alreadyAdvanced: true, roundId: state.roundId });
      }
      return jsonResponse(409, { ok: false, error: "not_finished", status: state.status });
    }
    // Guard against stale / duplicate triggers racing the same round.
    if (typeof body.fromRoundId === "number" && body.fromRoundId !== state.roundId) {
      return jsonResponse(200, { ok: true, alreadyAdvanced: true, roundId: state.roundId });
    }
    // Both participants must have opted into the rematch.
    const bothReady =
      !!state.hostId &&
      !!state.guestId &&
      state.rematchReady[state.hostId] === true &&
      state.rematchReady[state.guestId] === true;
    if (!bothReady) {
      return jsonResponse(409, { ok: false, error: "not_both_ready" });
    }

    // Apply the new round: bump roundId and reset all per-round state.
    state.roundId += 1;
    state.testContent = body.testContent;
    if (typeof body.contentSeed === "string") state.contentSeed = body.contentSeed;
    state.results = {};
    state.winnerId = null;
    state.rematchReady = {};
    state.lastProgress = {};
    state.finishedAt = null;
    state.startsAt = null;
    state.readiness = {};
    if (state.hostId) state.readiness[state.hostId] = false;
    if (state.guestId) state.readiness[state.guestId] = false;
    state.status = "ready";
    await this.persist();

    // Tell clients about the new prompt so they can reset their engines,
    // then immediately run the shared countdown into the active race.
    this.broadcastJson({
      type: "next_test_started",
      roundId: state.roundId,
      testContent: state.testContent,
      testConfig: state.testConfig,
      serverTs: Date.now(),
    });
    this.startCountdown(state);
    await this.persist();
    return jsonResponse(200, { ok: true, roundId: state.roundId });
  }

  // ─── WebSocket lifecycle ───────────────────────────────────────────────────

  async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    const playerId = this.extractPlayerId(conn, ctx);
    if (!playerId) {
      this.sendErr(conn, "missing_player_id", "playerId query param required");
      try {
        conn.close(1008, "missing_player_id");
      } catch {}
      return;
    }
    const state = await this.getState();
    if (!state) {
      this.sendErr(conn, "room_not_hydrated", "room has no state yet");
      try {
        conn.close(1011, "room_not_hydrated");
      } catch {}
      return;
    }

    const expired = Date.now() >= state.expiresAt;
    if (expired) {
      this.sendErr(conn, "party_expired", "party has expired");
      try {
        conn.close(1000, "party_expired");
      } catch {}
      return;
    }

    // ── Seat membership vs ACTIVE socket ───────────────────────────────────
    // `hostId`/`guestId` are SEAT membership. Holding (or matching) a seat
    // does NOT by itself entitle a brand-new socket to join while the seat's
    // ORIGINAL socket is still live. Because every browser tab/window in the
    // same (incognito) session can share the exact same `bk_guest_id`
    // (== playerId), a third browser can arrive carrying the guest's id. We
    // must therefore distinguish:
    //   (a) a true third UNIQUE player  -> reject `party_full`
    //   (b) a duplicate tab/window with an id that matches host/guest while
    //       that player's socket is STILL connected -> reject
    //       `player_already_connected` (do NOT replace the original)
    //   (c) a genuine reconnect, where the previous socket has actually
    //       closed -> allow the new socket to take over the seat.
    const isHost = playerId === state.hostId;
    const isKnownGuest = state.guestId !== null && playerId === state.guestId;

    let role: PartyRole | null = null;
    if (isHost) {
      role = "host";
    } else if (isKnownGuest) {
      role = "guest";
    } else if (state.guestId === null) {
      // Brand-new guest claiming the open seat.
      role = "guest";
    } else {
      // Guest seat already belongs to a DIFFERENT player → true third player.
      this.sendErr(conn, "party_full", "party already has two players");
      try {
        conn.close(1000, "party_full");
      } catch {}
      return;
    }

    // Duplicate ACTIVE connection guard. If this player already has another
    // LIVE socket open, reject the NEWCOMER instead of replacing the original.
    // This is what stops a third browser/tab that shares the same
    // `bk_guest_id` from hijacking a seat while the original tab is still
    // connected. A genuine reconnect passes because the prior socket has
    // already closed (so it is not counted as live).
    if (this.hasOtherLiveConnection(playerId, conn.id)) {
      this.sendErr(
        conn,
        "player_already_connected",
        "this party is already open in another tab",
      );
      try {
        conn.close(4001, "player_already_connected");
      } catch {}
      return;
    }

    // Passed every gate — only now do we claim an open guest seat and register
    // this socket as the player's active connection. An unaccepted socket
    // never reaches the snapshot broadcast below.
    if (role === "guest" && state.guestId === null) {
      state.guestId = playerId;
      state.readiness[playerId] = false;
    }
    this.connByPlayer.set(playerId, conn.id);

    // Update presence + lobby status.
    state.lastSeen[playerId] = Date.now();
    if (state.status === "waiting" && state.guestId) {
      state.status = "ready" satisfies PartyStatus;
    }

    // If a stale 'countdown' status survived hibernation past startsAt,
    // auto-promote to 'active' so clients don't get stuck.
    if (
      state.status === "countdown" &&
      typeof state.startsAt === "number" &&
      Date.now() >= state.startsAt
    ) {
      state.status = "active";
    }

    await this.persist();

    // Broadcast a full state_snapshot to ALL connected clients (including
    // the new one) so the host immediately sees the updated guestId in its
    // store. Then announce join to everyone except the new connection so
    // peers can react to the incremental event while the snapshot ensures
    // full consistency.
    this.broadcastJson({
      type: "state_snapshot",
      state,
      serverTs: Date.now(),
    });
    this.broadcastJson(
      {
        type: "player_joined",
        playerId,
        role,
        serverTs: Date.now(),
      },
      [conn.id],
    );

    // If we landed in countdown already (reconnect mid-countdown), and the
    // timer was lost during hibernation, reschedule it.
    if (
      state.status === "countdown" &&
      typeof state.startsAt === "number" &&
      !this.countdownTimer
    ) {
      const ms = Math.max(0, state.startsAt - Date.now());
      this.scheduleTestStart(ms);
    }
  }

  async onMessage(raw: string, sender: Party.Connection) {
    let msg: ClientToServer | null = null;
    try {
      msg = JSON.parse(raw) as ClientToServer;
    } catch {
      this.sendErr(sender, "bad_json", "could not parse message");
      return;
    }
    if (!msg || typeof (msg as { type?: unknown }).type !== "string") {
      this.sendErr(sender, "bad_shape", "message missing 'type'");
      return;
    }

    const state = await this.getState();
    if (!state) {
      this.sendErr(sender, "room_not_hydrated", "no state");
      return;
    }

    const senderPlayerId = this.playerIdFor(sender);
    if (!senderPlayerId) {
      this.sendErr(sender, "untagged_connection", "no playerId on connection");
      return;
    }
    if (msg.playerId !== senderPlayerId) {
      this.sendErr(sender, "player_id_mismatch", "spoofed playerId rejected");
      return;
    }

    switch (msg.type) {
      case "hello": {
        // Connection-time work already happened in onConnect. Re-send a fresh
        // snapshot so the client can reconcile after reconnects.
        this.sendTo(sender, {
          type: "state_snapshot",
          state,
          serverTs: Date.now(),
        });
        return;
      }

      case "heartbeat": {
        state.lastSeen[senderPlayerId] = Date.now();
        // Heartbeats are frequent — don't persist every one. We'll persist
        // opportunistically in other handlers.
        return;
      }

      case "set_ready": {
        // Ready toggles are only meaningful in 'waiting' or 'ready' status.
        if (state.status !== "waiting" && state.status !== "ready") {
          this.sendErr(sender, "not_in_lobby", "cannot ready outside lobby");
          return;
        }
        state.readiness[senderPlayerId] = !!msg.ready;
        this.broadcastJson({
          type: "ready_state_changed",
          playerId: senderPlayerId,
          ready: !!msg.ready,
          serverTs: Date.now(),
        });
        // Auto-start countdown when both players present and both ready.
        const bothPresent =
          state.hostId && state.guestId && this.bothConnected(state);
        const bothReady =
          bothPresent &&
          state.readiness[state.hostId] === true &&
          state.readiness[state.guestId!] === true;
        if (bothReady && state.status !== "countdown") {
          this.startCountdown(state);
        }
        await this.persist();
        return;
      }

      case "request_start": {
        // Host-only fallback (kept for completeness; UI uses auto-start).
        if (senderPlayerId !== state.hostId) {
          this.sendErr(sender, "not_host", "only host can request_start");
          return;
        }
        if (state.status !== "ready") {
          this.sendErr(sender, "not_ready", "both players must be present");
          return;
        }
        this.startCountdown(state);
        await this.persist();
        return;
      }

      case "leave": {
        // Treat like an onClose so disconnect cleanup is single-sourced.
        await this.handlePlayerExit(senderPlayerId, sender.id);
        try {
          sender.close(1000, "leave");
        } catch {}
        return;
      }

      case "progress": {
        // Only relay during an active race. Lobby progress is nonsense and
        // also a cheap guard against pre-start spam.
        if (state.status !== "active") return;

        // Per-player monotonic sequence. Drop stale or duplicate frames so
        // an out-of-order packet can't rewind the opponent's HUD.
        const prev = state.lastProgress[senderPlayerId];
        const incomingSeq =
          typeof msg.sequence === "number" && Number.isFinite(msg.sequence)
            ? msg.sequence
            : -1;
        if (incomingSeq <= 0) return;
        if (prev && incomingSeq <= prev.sequence) return;

        // Clamp/validate numeric fields defensively — never trust the wire.
        const sample: PartyRoomState["lastProgress"][string] = {
          playerId: senderPlayerId,
          sequence: incomingSeq,
          charIndex: clampInt(msg.charIndex, 0, state.testContent.length),
          correctChars: clampInt(msg.correctChars, 0, 1_000_000),
          incorrectChars: clampInt(msg.incorrectChars, 0, 1_000_000),
          wpm: clampNumber(msg.wpm, 0, 600),
          accuracy: clampNumber(msg.accuracy, 0, 100),
          elapsedMs: clampInt(msg.elapsedMs, 0, 60 * 60 * 1000),
          clientTs:
            typeof msg.clientTs === "number" && Number.isFinite(msg.clientTs)
              ? msg.clientTs
              : Date.now(),
        };
        state.lastProgress[senderPlayerId] = sample;
        // Also refresh presence on every progress sample; if the typer is
        // actively typing we should never time them out.
        state.lastSeen[senderPlayerId] = Date.now();

        // Relay only to the opponent. Sending it back to the typer wastes
        // bandwidth and would echo their own state into the HUD.
        const senderConnId = this.connByPlayer.get(senderPlayerId);
        this.broadcastJson(
          {
            type: "progress_relay",
            progress: sample,
            serverTs: Date.now(),
          },
          senderConnId ? [senderConnId] : undefined,
        );
        // Progress is high-frequency and ephemeral; do NOT persist on every
        // frame. The room is fine if it loses the last few samples on
        // hibernation — clients will resend on reconnect.
        return;
      }

      case "finish": {
        // Only meaningful during an active race. Ignore otherwise so a late
        // packet after the round closed can't reopen it.
        if (state.status !== "active") return;
        // Stale-round guard: a finish for a previous round (e.g. arriving
        // after a rematch already started) must be dropped.
        if (
          typeof msg.roundId !== "number" ||
          msg.roundId !== state.roundId
        ) {
          return;
        }
        // First finish per player per round wins; ignore duplicates.
        if (state.results[senderPlayerId]) return;

        const result: FinalResult = {
          playerId: senderPlayerId,
          roundId: state.roundId,
          finalWpm: clampNumber(msg.finalWpm, 0, 600),
          finalAccuracy: clampNumber(msg.finalAccuracy, 0, 100),
          correctChars: clampInt(msg.correctChars, 0, 1_000_000),
          incorrectChars: clampInt(msg.incorrectChars, 0, 1_000_000),
          completed: msg.completed === true,
          finishTimeMs:
            msg.finishTimeMs == null
              ? null
              : clampInt(msg.finishTimeMs, 0, 60 * 60 * 1000),
        };
        state.results[senderPlayerId] = result;
        state.lastSeen[senderPlayerId] = Date.now();

        // Tell both clients someone finished. The opponent uses this to show
        // a "finished — waiting" indicator while they keep typing.
        this.broadcastJson({
          type: "player_finished",
          result,
          serverTs: Date.now(),
        });

        // Close the round only once BOTH participants have a result. A single
        // finisher stays parked in the (still active) race waiting screen.
        const haveBoth =
          !!state.hostId &&
          !!state.guestId &&
          !!state.results[state.hostId] &&
          !!state.results[state.guestId];
        if (haveBoth) {
          this.finalizeRound(state);
        }
        await this.persist();
        return;
      }

      case "rematch_ready": {
        // Rematch readiness is only meaningful once the round is finished.
        if (state.status !== "finished") {
          this.sendErr(sender, "not_finished", "cannot rematch before finish");
          return;
        }
        // Stale guard: must reference the round that just finished.
        if (typeof msg.roundId === "number" && msg.roundId !== state.roundId) {
          return;
        }
        state.rematchReady[senderPlayerId] = msg.ready === true;
        state.lastSeen[senderPlayerId] = Date.now();
        this.broadcastJson({
          type: "rematch_ready_changed",
          playerId: senderPlayerId,
          ready: msg.ready === true,
          serverTs: Date.now(),
        });
        // The actual round advance is driven by the host's client calling
        // /api/party/rematch (server route → next_round op), because new
        // content must be generated in the Next.js runtime.
        await this.persist();
        return;
      }

      default:
        this.sendErr(sender, "unknown_message_type", String((msg as any).type));
        return;
    }
  }

  async onClose(conn: Party.Connection) {
    const playerId = this.playerIdFor(conn);
    if (!playerId) return;
    // Only treat as exit if this is still the registered connection. A
    // newer reconnect might have already replaced this conn.id.
    if (this.connByPlayer.get(playerId) !== conn.id) return;
    await this.handlePlayerExit(playerId, conn.id);
  }

  // Storage alarm fires at expiresAt (set when the room was first hydrated).
  // We use it as the room's TTL: mark expired, broadcast a final snapshot,
  // and politely disconnect any lingering sockets. We deliberately do NOT
  // delete the persisted state here so that any late-arriving lookup still
  // sees "expired" rather than "room_not_hydrated".
  //
  // Future-compatibility note (rematch / multiple tests): the alarm fires
  // strictly on the TTL boundary. A successful single race does not advance
  // expiresAt, so back-to-back tests inside the same room remain possible
  // until the TTL hits. Do NOT trigger expiry on `finish`.
  async onAlarm() {
    const state = await this.getState();
    if (!state) return;
    if (state.status === "expired") return;
    state.status = "expired";
    state.finishedAt = state.finishedAt ?? Date.now();
    this.cancelCountdown();
    await this.persist();

    // Tell whoever is still connected, then drop them. Survivors will see
    // a friendly "party expired" message via the existing error handler.
    this.broadcastJson({
      type: "state_snapshot",
      state,
      serverTs: Date.now(),
    });
    for (const conn of this.room.getConnections()) {
      try {
        this.sendErr(conn, "party_expired", "party has expired");
      } catch {}
      try {
        conn.close(1000, "party_expired");
      } catch {}
    }
  }

  // ─── State machine helpers ────────────────────────────────────────────────

  private async handlePlayerExit(playerId: string, connId: string) {
    const state = await this.getState();
    if (!state) return;
    if (this.connByPlayer.get(playerId) === connId) {
      this.connByPlayer.delete(playerId);
    }

    const wasHost = playerId === state.hostId;
    const wasGuest = playerId === state.guestId;
    const wasParticipant = wasHost || wasGuest;

    // ── Disconnect during an ACTIVE race ───────────────────────────────────
    // Record the leaver as DNF (using their last known progress, if any). We
    // deliberately KEEP both slots so the leaver can reconnect to view results
    // or accept a rematch (the join route allows known-id reconnects).
    //
    // If the OTHER participant has ALREADY finished, we can close the round now
    // and they get their results. Otherwise we keep the race ACTIVE so the
    // remaining player can keep typing (matching the existing "opponent
    // disconnected — keep typing" behaviour) and the round finalizes when they
    // finish.
    if (state.status === "active" && wasParticipant) {
      if (!state.results[playerId]) {
        const lp = state.lastProgress[playerId];
        state.results[playerId] = {
          playerId,
          roundId: state.roundId,
          finalWpm: lp ? clampNumber(lp.wpm, 0, 600) : 0,
          finalAccuracy: lp ? clampNumber(lp.accuracy, 0, 100) : 0,
          correctChars: lp ? clampInt(lp.correctChars, 0, 1_000_000) : 0,
          incorrectChars: lp ? clampInt(lp.incorrectChars, 0, 1_000_000) : 0,
          completed: false,
          finishTimeMs: null,
        };
      }
      this.broadcastJson({
        type: "player_left",
        playerId,
        serverTs: Date.now(),
      });
      const otherId = playerId === state.hostId ? state.guestId : state.hostId;
      const otherHasResult = otherId ? !!state.results[otherId] : false;
      if (otherHasResult) {
        this.finalizeRound(state, { leaver: playerId });
      } else {
        // Keep racing; just push a snapshot so survivors see the updated
        // presence/result state without ending their run.
        this.broadcastJson({
          type: "state_snapshot",
          state,
          serverTs: Date.now(),
        });
      }
      await this.persist();
      void wasHost;
      return;
    }

    // Free the guest slot on disconnect for lobby-phase statuses so the Guest
    // card reverts to "Waiting". We do NOT free it once a round is `finished`:
    // keeping the slot lets the guest reconnect to the results screen (network
    // blip) and keeps a rematch possible. (Active-race disconnects were already
    // handled above and also keep the slot.)
    if (wasGuest && state.status !== "finished") {
      state.guestId = null;
      delete state.readiness[playerId];
      // Zero out lastSeen so time-based member derivation (if ever used)
      // doesn't keep the player alive past their actual disconnect.
      delete (state.lastSeen as Record<string, number>)[playerId];
    }

    // Determine new status now that the guest slot may be empty.
    if (state.status === "waiting" || state.status === "ready") {
      // With guest gone, revert to waiting.
      if (wasGuest) state.status = "waiting";
    } else if (state.status === "countdown") {
      // Cancel in-flight countdown and reset all readiness so both players
      // must re-confirm before a new countdown can start.
      this.cancelCountdown();
      state.startsAt = null;
      state.status = "waiting";
      if (state.hostId) state.readiness[state.hostId] = false;
      // guestId/readiness already cleared above if wasGuest; safe no-op otherwise.
    }

    this.broadcastJson({
      type: "player_left",
      playerId,
      serverTs: Date.now(),
    });
    // Push a fresh snapshot so survivors see the new authoritative state
    // (especially status transitions). Cheaper than every event being
    // 100% correct on its own.
    this.broadcastJson({
      type: "state_snapshot",
      state,
      serverTs: Date.now(),
    });
    await this.persist();
    // Suppress unused warning on `wasHost`; intentional for future use.
    void wasHost;
  }

  // Close the current round: compute the winner, flip to `finished`, and
  // broadcast `party_finished` plus a fresh snapshot (so reconnecting clients
  // land on the results screen). Does NOT touch expiresAt — the room lives on
  // for rematches until its TTL alarm fires.
  private finalizeRound(state: PartyRoomState, opts?: { leaver?: string }) {
    this.cancelCountdown();
    state.startsAt = null;
    state.status = "finished";
    state.finishedAt = state.finishedAt ?? Date.now();
    state.winnerId = decideWinner(state, opts?.leaver);

    const results: FinalResult[] = [];
    if (state.hostId && state.results[state.hostId]) {
      results.push(state.results[state.hostId]);
    }
    if (state.guestId && state.results[state.guestId]) {
      results.push(state.results[state.guestId]);
    }

    this.broadcastJson({
      type: "party_finished",
      roundId: state.roundId,
      winnerId: state.winnerId,
      results,
      serverTs: Date.now(),
    });
    this.broadcastJson({
      type: "state_snapshot",
      state,
      serverTs: Date.now(),
    });
  }

  private startCountdown(state: PartyRoomState) {
    state.status = "countdown";
    const startsAt = Date.now() + COUNTDOWN_MS;
    state.startsAt = startsAt;
    this.broadcastJson({
      type: "countdown_started",
      startsAt,
      serverTs: Date.now(),
    });
    this.scheduleTestStart(COUNTDOWN_MS);
  }

  private scheduleTestStart(ms: number) {
    this.cancelCountdown();
    this.countdownTimer = setTimeout(async () => {
      this.countdownTimer = null;
      const s = await this.getState();
      if (!s) return;
      if (s.status !== "countdown") return; // canceled mid-flight
      s.status = "active";
      await this.persist();
      this.broadcastJson({
        type: "test_started",
        startsAt: s.startsAt ?? Date.now(),
        serverTs: Date.now(),
      });
      // Also push a snapshot so any client reconnecting at the boundary
      // doesn't race the test_started event.
      this.broadcastJson({
        type: "state_snapshot",
        state: s,
        serverTs: Date.now(),
      });
    }, Math.max(0, ms));
  }

  private cancelCountdown() {
    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  private bothConnected(state: PartyRoomState): boolean {
    if (!state.hostId || !state.guestId) return false;
    return (
      this.connByPlayer.has(state.hostId) &&
      this.connByPlayer.has(state.guestId)
    );
  }

  // True only for sockets that are CONNECTING/OPEN. CLOSING/CLOSED sockets are
  // treated as gone so a genuine reconnect (old socket already closed) is not
  // mistaken for a live duplicate. `undefined` readyState (rare hibernated
  // states) is treated as live so we FAIL CLOSED toward blocking duplicates
  // rather than admitting a third active socket.
  private isLiveConn(conn: Party.Connection, selfConnId?: string): boolean {
    if (selfConnId && conn.id === selfConnId) return false;
    const rs = (conn as unknown as { readyState?: number }).readyState;
    return rs !== 2 && rs !== 3; // not CLOSING and not CLOSED
  }

  // Does `playerId` already hold a live socket OTHER than `selfConnId`?
  // Reads from the room's live connection set filtered by the `pid:` tag, so
  // it stays correct across hibernation (where `connByPlayer` is empty).
  private hasOtherLiveConnection(playerId: string, selfConnId: string): boolean {
    try {
      for (const c of this.room.getConnections(`pid:${playerId}`)) {
        if (this.isLiveConn(c, selfConnId)) return true;
      }
    } catch {}
    return false;
  }

  // Safe, testContent-free summary of which players currently hold a live
  // socket. Used by the room GET endpoint so /api/party/join can enforce the
  // "max two active connections" rule before a third browser ever connects.
  private liveConnectionInfo(state: PartyRoomState): {
    activePlayerIds: string[];
    activeConnectionCount: number;
    hostConnected: boolean;
    guestConnected: boolean;
  } {
    const activePlayerIds: string[] = [];
    let activeConnectionCount = 0;
    try {
      for (const c of this.room.getConnections()) {
        if (!this.isLiveConn(c)) continue;
        activeConnectionCount += 1;
        const pid = this.playerIdFromConn(c);
        if (pid && !activePlayerIds.includes(pid)) activePlayerIds.push(pid);
      }
    } catch {}
    return {
      activePlayerIds,
      activeConnectionCount,
      hostConnected: state.hostId
        ? activePlayerIds.includes(state.hostId)
        : false,
      guestConnected: state.guestId
        ? activePlayerIds.includes(state.guestId)
        : false,
    };
  }

  private playerIdFromConn(conn: Party.Connection): string | null {
    try {
      const u = new URL(conn.uri);
      return u.searchParams.get("playerId");
    } catch {
      return null;
    }
  }

  // ─── Utilities ────────────────────────────────────────────────────────────

  private async getState(): Promise<PartyRoomState | null> {
    if (this.state) return this.state;
    try {
      const persisted = await this.room.storage.get<PartyRoomState>(
        STORAGE_KEY_STATE,
      );
      if (persisted) this.state = normalizeState(persisted);
      return this.state;
    } catch {
      return null;
    }
  }

  private async persist() {
    if (this.state) await this.room.storage.put(STORAGE_KEY_STATE, this.state);
  }

  private isAdminAuthorized(req: Party.Request): boolean {
    const expected = String(this.room.env?.PARTYKIT_ADMIN_TOKEN ?? "");
    if (!expected) return false;
    const got = req.headers.get("authorization") ?? "";
    if (!got.startsWith("Bearer ")) return false;
    const token = got.slice("Bearer ".length);
    return constantTimeEqual(token, expected);
  }

  private extractPlayerId(
    _conn: Party.Connection,
    ctx: Party.ConnectionContext,
  ): string | null {
    try {
      const url = new URL((ctx.request as { url: string }).url);
      return url.searchParams.get("playerId");
    } catch {
      return null;
    }
  }

  private playerIdFor(conn: Party.Connection): string | null {
    // Reverse-lookup from connByPlayer. Cheap: max 2 entries.
    for (const [pid, cid] of this.connByPlayer) {
      if (cid === conn.id) return pid;
    }
    // Fallback: parse from conn.uri if available
    try {
      const u = new URL(conn.uri);
      return u.searchParams.get("playerId");
    } catch {
      return null;
    }
  }

  private sendTo(conn: Party.Connection, msg: ServerToClient) {
    try {
      conn.send(JSON.stringify(msg));
    } catch {}
  }

  private sendErr(conn: Party.Connection, code: string, message: string) {
    this.sendTo(conn, {
      type: "error",
      code,
      message,
      serverTs: Date.now(),
    });
  }

  private broadcastJson(msg: ServerToClient, exceptConnIds?: string[]) {
    try {
      this.room.broadcast(JSON.stringify(msg), exceptConnIds);
    } catch {}
  }
}

// Backfill round/results fields for rooms persisted before Phase 7 so older
// hibernated rooms don't surface `undefined` after a deploy. Mutates + returns.
function normalizeState(state: PartyRoomState): PartyRoomState {
  if (typeof state.roundId !== "number" || !Number.isFinite(state.roundId)) {
    state.roundId = 1;
  }
  if (!state.results || typeof state.results !== "object") {
    state.results = {};
  }
  if (state.winnerId === undefined) {
    state.winnerId = null;
  }
  if (!state.rematchReady || typeof state.rematchReady !== "object") {
    state.rematchReady = {};
  }
  return state;
}

// Winner rules for words mode (both players type the identical prompt):
//   1. exactly one completed  -> that player
//   2. both completed         -> lower finishTimeMs; tie-break higher wpm, then
//                                higher accuracy; else null (tie)
//   3. neither completed      -> null, UNLESS a leaver is given and the
//                                remaining player made meaningful progress, in
//                                which case the remaining player wins by forfeit
function decideWinner(
  state: PartyRoomState,
  leaver?: string,
): string | null {
  const hostId = state.hostId;
  const guestId = state.guestId;
  const a = hostId ? state.results[hostId] : undefined;
  const b = guestId ? state.results[guestId] : undefined;

  if (a && b) {
    if (a.completed && !b.completed) return a.playerId;
    if (b.completed && !a.completed) return b.playerId;
    if (a.completed && b.completed) {
      const at = a.finishTimeMs ?? Number.POSITIVE_INFINITY;
      const bt = b.finishTimeMs ?? Number.POSITIVE_INFINITY;
      if (at < bt) return a.playerId;
      if (bt < at) return b.playerId;
      if (a.finalWpm !== b.finalWpm) {
        return a.finalWpm > b.finalWpm ? a.playerId : b.playerId;
      }
      if (a.finalAccuracy !== b.finalAccuracy) {
        return a.finalAccuracy > b.finalAccuracy ? a.playerId : b.playerId;
      }
      return null;
    }
    // Neither completed.
    if (leaver) {
      const remaining = leaver === hostId ? b : a;
      if (remaining && hasMeaningfulProgress(remaining)) return remaining.playerId;
    }
    return null;
  }

  // Only one (or zero) results present — disconnect-finish path.
  if (leaver) {
    const remaining = leaver === hostId ? b : a;
    if (remaining && (remaining.completed || hasMeaningfulProgress(remaining))) {
      return remaining.playerId;
    }
  }
  // A lone completed result (opponent never produced one) still wins.
  if (a && a.completed && !b) return a.playerId;
  if (b && b.completed && !a) return b.playerId;
  return null;
}

function hasMeaningfulProgress(r: FinalResult): boolean {
  return r.correctChars > 0 || r.finalWpm > 0;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function clampInt(v: unknown, min: number, max: number): number {
  const n = typeof v === "number" && Number.isFinite(v) ? Math.trunc(v) : 0;
  return Math.max(min, Math.min(max, n));
}

function clampNumber(v: unknown, min: number, max: number): number {
  const n = typeof v === "number" && Number.isFinite(v) ? v : 0;
  return Math.max(min, Math.min(max, n));
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
