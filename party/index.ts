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
      if (persisted) this.state = persisted;
    } catch {
      this.state = null;
    }
  }

  // ─── HTTP control plane (Phase 1 hydration; unchanged shape) ──────────────

  async onRequest(req: Party.Request): Promise<Response> {
    if (req.method === "GET") return this.handleGet();
    if (req.method === "POST") return this.handleHydratePost(req);
    return new Response("Method Not Allowed", { status: 405 });
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
    return jsonResponse(200, {
      ok: true,
      partyId: this.room.id,
      code: s.code,
      status: s.status,
      hostId: s.hostId,
      guestId: s.guestId,
      expiresAt: s.expiresAt,
      createdAt: s.createdAt,
    });
  }

  private async handleHydratePost(req: Party.Request): Promise<Response> {
    if (!this.isAdminAuthorized(req)) {
      return jsonResponse(401, { ok: false, error: "unauthorized" });
    }
    let body: HydrateBody | null = null;
    try {
      body = (await req.json()) as HydrateBody;
    } catch {
      return jsonResponse(400, { ok: false, error: "bad_json" });
    }
    if (!body || body.op !== "hydrate" || !body.state) {
      return jsonResponse(400, { ok: false, error: "unknown_op" });
    }
    const incoming = body.state;
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

    // Claim host/guest slot.
    let role: PartyRole | null = null;
    if (playerId === state.hostId) {
      role = "host";
    } else if (state.guestId === null || state.guestId === playerId) {
      // Open guest slot, OR same guest reconnecting.
      role = "guest";
      if (state.guestId === null) {
        state.guestId = playerId;
        state.readiness[playerId] = false;
      }
    } else {
      // Room is full with a different guest.
      this.sendErr(conn, "party_full", "party already has two players");
      try {
        conn.close(1000, "party_full");
      } catch {}
      return;
    }

    // Enforce one socket per player. If the same playerId is already
    // connected (e.g. duplicated tab), close the older one.
    const existingConnId = this.connByPlayer.get(playerId);
    if (existingConnId && existingConnId !== conn.id) {
      const existing = this.room.getConnection(existingConnId);
      if (existing) {
        try {
          existing.close(4000, "replaced_by_newer_connection");
        } catch {}
      }
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

      // Phase 6 message — explicit no-op for now.
      case "finish":
        return;

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

    // Always free the guest slot on disconnect, regardless of current status.
    // This ensures the snapshot broadcast below reflects the empty slot so
    // clients reliably revert the Guest card to "Waiting".
    if (wasGuest) {
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

  // ─── Utilities ────────────────────────────────────────────────────────────

  private async getState(): Promise<PartyRoomState | null> {
    if (this.state) return this.state;
    try {
      const persisted = await this.room.storage.get<PartyRoomState>(
        STORAGE_KEY_STATE,
      );
      if (persisted) this.state = persisted;
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
