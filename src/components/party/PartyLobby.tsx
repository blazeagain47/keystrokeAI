"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Crown, User, Hourglass, Check, Wifi, WifiOff } from "lucide-react";
import clsx from "clsx";

import { joinParty, PartyApiError } from "@/lib/party/api";
import { connectToParty, type PartyClientHandle } from "@/lib/party/client";
import { getOrCreatePlayerId } from "@/lib/party/playerId";
import { usePartyStore } from "@/stores/usePartyStore";

import CopyCodeButton from "./CopyCodeButton";
import PartyCountdown from "./PartyCountdown";
import PartyRace from "./PartyRace";

interface PartyLobbyProps {
  /** Public 6-digit code from the URL. */
  code: string;
}

const HEARTBEAT_MS = 3000;

/**
 * Phase 3 lobby. Holds the WebSocket connection to the PartyKit room for
 * the lifetime of the page and dispatches the screen to render based on
 * authoritative party status (waiting / ready / countdown / active).
 *
 * Phase 4: when status === "active" we render `PartyRace`, which embeds the
 * shared TypingBox and wires the throttled `progress` -> `progress_relay`
 * realtime path. The WebSocket itself is owned by this lobby component and
 * handed down so the connection survives the lobby ↔ race transitions.
 */
export default function PartyLobby({ code }: PartyLobbyProps) {
  const router = useRouter();
  const party = usePartyStore((s) => s.party);
  const live = usePartyStore((s) => s.live);
  const loading = usePartyStore((s) => s.loading);
  const error = usePartyStore((s) => s.error);
  const setLoading = usePartyStore((s) => s.setLoading);
  const setError = usePartyStore((s) => s.setError);
  const setFromJoin = usePartyStore((s) => s.setFromJoin);
  const applySnapshot = usePartyStore((s) => s.applySnapshot);
  const markPlayerJoined = usePartyStore((s) => s.markPlayerJoined);
  const markPlayerLeft = usePartyStore((s) => s.markPlayerLeft);
  const setReadyFor = usePartyStore((s) => s.setReadyFor);
  const applyCountdownStarted = usePartyStore((s) => s.applyCountdownStarted);
  const applyTestStarted = usePartyStore((s) => s.applyTestStarted);
  const setConnected = usePartyStore((s) => s.setConnected);
  const applyProgressRelay = usePartyStore((s) => s.applyProgressRelay);
  const setOpponentDisconnected = usePartyStore((s) => s.setOpponentDisconnected);
  const clear = usePartyStore((s) => s.clear);

  const [playerId, setPlayerId] = useState<string | null>(null);
  const clientRef = useRef<PartyClientHandle | null>(null);

  // Resolve playerId once on mount (browser-only).
  useEffect(() => {
    setPlayerId(getOrCreatePlayerId());
  }, []);

  // Fetch party config if the store doesn't already have it (deep link /
  // refresh path). For the create flow, the store is already hydrated.
  useEffect(() => {
    if (!code || !playerId) return;
    if (party?.code === code) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await joinParty({ code, guestPlayerId: playerId });
        if (cancelled) return;
        setFromJoin({
          partyId: resp.partyId,
          code: resp.code,
          hostId: resp.hostId,
          status: resp.status,
          testConfig: resp.testConfig,
          testContent: resp.testContent,
          expiresAt: resp.expiresAt,
        });
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof PartyApiError ? e.message : "Couldn't load party.";
        setError(msg);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, playerId, party?.code, setLoading, setError, setFromJoin]);

  // Open WebSocket once we know the partyId and playerId. Keep it alive
  // for the lifetime of this component.
  useEffect(() => {
    if (!playerId || !party?.partyId) return;
    // Avoid reopening if already connected to the same room.
    if (clientRef.current?.partyId === party.partyId) return;

    // Close any stale client (e.g. user navigated /a → /b).
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }

    const client = connectToParty(party.partyId, playerId);
    clientRef.current = client;

    const offMsg = client.onMessage((msg) => {
      switch (msg.type) {
        case "state_snapshot":
          applySnapshot(msg.state, playerId);
          break;
        case "player_joined":
          markPlayerJoined(msg.playerId, msg.role);
          // Treat a re-join as reconnect for banner purposes (only matters
          // mid-race; in the lobby this is already conveyed by presence).
          if (msg.playerId !== playerId) setOpponentDisconnected(false);
          break;
        case "player_left":
          markPlayerLeft(msg.playerId);
          // If the opponent leaves while we're racing, surface a non-fatal
          // banner via the same flag the explicit opponent_disconnected
          // event would set. Local typing continues.
          if (msg.playerId !== playerId) setOpponentDisconnected(true);
          break;
        case "ready_state_changed":
          setReadyFor(msg.playerId, msg.ready);
          break;
        case "countdown_started":
          applyCountdownStarted(msg.startsAt);
          break;
        case "test_started":
          applyTestStarted();
          break;
        case "progress_relay":
          applyProgressRelay(msg.progress);
          break;
        case "opponent_disconnected":
          // Non-fatal — keep the race screen mounted; just show a banner.
          if (msg.playerId !== playerId) setOpponentDisconnected(true);
          break;
        case "opponent_reconnected":
          if (msg.playerId !== playerId) setOpponentDisconnected(false);
          break;
        case "error":
          // Treat fatal-ish errors as banner errors so the user knows.
          if (
            msg.code === "party_full" ||
            msg.code === "party_expired" ||
            msg.code === "room_not_hydrated" ||
            msg.code === "missing_player_id" ||
            msg.code === "player_id_mismatch"
          ) {
            setError(friendlySocketError(msg.code));
          }
          break;
        // Phase 6+ messages — results UI lands in a later phase. We still
        // accept and ignore them here so the WS path stays clean.
        case "player_finished":
        case "party_finished":
        case "hello_ack":
        case "echo":
          break;
      }
    });

    const offOpen = client.onOpen(() => {
      setConnected(true);
      // Send hello so the server can reissue a fresh snapshot after each
      // reconnect (covers transient disconnects without page refresh).
      client.send({
        type: "hello",
        protocolVersion: 1,
        playerId,
        clientTs: Date.now(),
      });
    });

    const offClose = client.onClose(() => {
      setConnected(false);
    });

    // Heartbeat: tells the server we're still here so lastSeen stays fresh.
    const heartbeat = window.setInterval(() => {
      client.send({ type: "heartbeat", playerId, clientTs: Date.now() });
    }, HEARTBEAT_MS);

    return () => {
      try {
        window.clearInterval(heartbeat);
      } catch {}
      offMsg();
      offOpen();
      offClose();
      try {
        // Send a polite leave so the server can update presence promptly.
        client.send({ type: "leave", playerId, clientTs: Date.now() });
      } catch {}
      client.disconnect();
      if (clientRef.current === client) {
        clientRef.current = null;
      }
    };
  }, [
    playerId,
    party?.partyId,
    applySnapshot,
    markPlayerJoined,
    markPlayerLeft,
    setReadyFor,
    applyCountdownStarted,
    applyTestStarted,
    setConnected,
    applyProgressRelay,
    setOpponentDisconnected,
    setError,
  ]);

  // Derived helpers
  const selfReady = useMemo(() => {
    if (!playerId) return false;
    return live.readiness[playerId] === true;
  }, [live.readiness, playerId]);

  const handleToggleReady = useCallback(() => {
    if (!playerId || !clientRef.current) return;
    clientRef.current.send({
      type: "set_ready",
      playerId,
      ready: !selfReady,
      clientTs: Date.now(),
    });
    // Optimistic flip — server will confirm via ready_state_changed.
    setReadyFor(playerId, !selfReady);
  }, [playerId, selfReady, setReadyFor]);

  const handleLeave = useCallback(() => {
    if (clientRef.current && playerId) {
      try {
        clientRef.current.send({ type: "leave", playerId, clientTs: Date.now() });
      } catch {}
      clientRef.current.disconnect();
      clientRef.current = null;
    }
    clear();
    router.push("/party");
  }, [clear, router, playerId]);

  const testSummary = useMemo(() => {
    if (!party) return "";
    const cfg = party.testConfig;
    const flags: string[] = [];
    if (cfg.flags?.punctuation) flags.push("punctuation");
    if (cfg.flags?.numbers) flags.push("numbers");
    const parts = [
      cfg.mode === "words" ? `Words • ${cfg.wordCount}` : `Time • ${cfg.timeLimit}s`,
      ...flags,
    ];
    return parts.join(" • ");
  }, [party]);

  // ─── Render branches ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <LobbyShell>
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="h-10 w-10 rounded-full border-2 border-orange-300/30 border-t-orange-300 animate-spin" />
          <p className="text-gray-400">Loading party…</p>
        </div>
      </LobbyShell>
    );
  }

  if (error || !party) {
    return (
      <LobbyShell>
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-red-300/90 max-w-md">
            {error ?? "We couldn't find that party."}
          </p>
          <Link
            href="/party"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800/60 hover:bg-gray-700/70 border border-gray-700/40 text-sm text-gray-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to lobby entry
          </Link>
        </div>
      </LobbyShell>
    );
  }

  // Expired (TTL elapsed) — friendly terminal state. The room may still be
  // alive on PartyKit but rejects new connections; do not auto-redirect so
  // the user can read the message and act.
  if (party.status === "expired") {
    return (
      <LobbyShell>
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-amber-300/90 max-w-md">
            This party has expired. Codes last 30 minutes; ask your friend
            to create a new one.
          </p>
          <Link
            href="/party"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800/60 hover:bg-gray-700/70 border border-gray-700/40 text-sm text-gray-200"
            onClick={() => clear()}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to lobby entry
          </Link>
        </div>
      </LobbyShell>
    );
  }

  // Race finished but the results UI is intentionally not implemented in
  // this phase. Show a minimal placeholder so the user is never stuck on
  // a blank screen if the server transitions to `finished` early.
  if (party.status === "finished") {
    return (
      <LobbyShell>
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-emerald-300/90 max-w-md">Race finished.</p>
          <p className="text-xs text-gray-500 max-w-md">
            The full results screen is coming in a follow-up update.
          </p>
          <Link
            href="/party"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800/60 hover:bg-gray-700/70 border border-gray-700/40 text-sm text-gray-200"
            onClick={() => clear()}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to lobby entry
          </Link>
        </div>
      </LobbyShell>
    );
  }

  // Defensive: the URL has a code but we somehow don't have a playerId yet.
  // Render a loading state instead of crashing on the missing identity.
  if (!playerId) {
    return (
      <LobbyShell>
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="h-10 w-10 rounded-full border-2 border-orange-300/30 border-t-orange-300 animate-spin" />
          <p className="text-gray-400">Preparing your player profile…</p>
        </div>
      </LobbyShell>
    );
  }

  // Active race. Only mount PartyRace for the confirmed host or guest.
  // `party.hostId` is known from the join/create API response.
  // `party.guestId` is populated by the first state_snapshot from PartyKit
  // once the guest's socket is accepted — a third player's socket is
  // rejected in PartyKit's onConnect before any snapshot arrives, so
  // their `party.guestId` remains null and this guard blocks them.
  if (party.status === "active") {
    const isConfirmedParticipant =
      playerId === party.hostId || playerId === party.guestId;

    if (!isConfirmedParticipant || !clientRef.current) {
      // Defense-in-depth: API should have blocked the third player already.
      // If they somehow reach this point, show a clear error instead of
      // mounting PartyRace with no valid identity.
      return (
        <LobbyShell>
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-red-300/90 max-w-md">
              This party already has two players.
            </p>
            <Link
              href="/party"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800/60 hover:bg-gray-700/70 border border-gray-700/40 text-sm text-gray-200"
              onClick={() => clear()}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to lobby entry
            </Link>
          </div>
        </LobbyShell>
      );
    }

    const opponentId =
      party.role === "host"
        ? party.guestId
        : party.hostId !== playerId
        ? party.hostId
        : null;
    return (
      <PartyRace
        testContent={party.testContent}
        testConfig={party.testConfig}
        selfPlayerId={playerId}
        opponentPlayerId={opponentId}
        client={clientRef.current}
        onLeave={handleLeave}
      />
    );
  }

  // Countdown screen.
  if (party.status === "countdown" && typeof live.startsAt === "number") {
    return (
      <PartyCountdown startsAt={live.startsAt} preview={party.testContent} />
    );
  }

  // Default: waiting / ready lobby.
  const hostPresent = !!live.members[party.hostId];
  const guestPresent = !!(party.guestId && live.members[party.guestId]);
  const youAreHost = party.role === "host";
  const hostReady = !!live.readiness[party.hostId];
  const guestReady = !!(party.guestId && live.readiness[party.guestId]);

  return (
    <LobbyShell>
      {/* Header row */}
      <div className="flex items-center justify-between mb-8">
        <button
          type="button"
          onClick={handleLeave}
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200"
          aria-label="Leave party"
        >
          <ArrowLeft className="h-4 w-4" />
          Leave
        </button>
        <span className="flex items-center gap-3 text-xs uppercase tracking-wider text-gray-500">
          <ConnectionIndicator connected={live.connected} />
          {testSummary}
        </span>
      </div>

      {/* Big code panel */}
      <section className="rounded-2xl border border-gray-700/40 bg-gray-900/40 backdrop-blur-sm p-6 sm:p-8 mb-6">
        <p className="text-xs uppercase tracking-wider text-gray-500 text-center mb-2">
          Share this code
        </p>
        <div className="flex items-center justify-center gap-4 mb-4">
          <div
            className="font-mono text-5xl sm:text-6xl tracking-[0.35em] text-gray-100 select-all"
            aria-label={`Party code ${party.code.split("").join(" ")}`}
          >
            {party.code}
          </div>
          <CopyCodeButton code={party.code} />
        </div>
      </section>

      {/* Players panel */}
      <section className="grid gap-4 sm:grid-cols-2 mb-6">
        <PlayerCard
          label="Host"
          icon={<Crown className="h-5 w-5 text-yellow-300" />}
          youAreThisPlayer={youAreHost}
          present={hostPresent}
          ready={hostReady}
        />
        <PlayerCard
          label="Guest"
          icon={<User className="h-5 w-5 text-cyan-300" />}
          youAreThisPlayer={!youAreHost}
          present={guestPresent}
          ready={guestReady}
        />
      </section>

      {/* Ready CTA */}
      <section
        className="rounded-xl border border-gray-700/40 bg-gray-900/40 backdrop-blur-sm p-5 mb-3"
        aria-live="polite"
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Hourglass className="h-4 w-4 text-orange-300" />
            <span className="text-sm text-gray-300">
              {!guestPresent
                ? "Waiting for opponent to join…"
                : !hostReady || !guestReady
                ? "Both players must be ready to start."
                : "Starting…"}
            </span>
          </div>
          <button
            type="button"
            onClick={handleToggleReady}
            disabled={!guestPresent && !youAreHost} // guests can't ready until they're connected (they always are if this renders)
            className={clsx(
              "px-5 py-2.5 rounded-xl font-semibold text-sm transition-all",
              selfReady
                ? "bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/30"
                : "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/20 hover:from-orange-400 hover:to-red-400",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
            aria-pressed={selfReady}
          >
            {selfReady ? (
              <span className="inline-flex items-center gap-2">
                <Check className="h-4 w-4" /> Ready
              </span>
            ) : (
              "I'm ready"
            )}
          </button>
        </div>
      </section>
      <p className="text-[11px] text-gray-500 text-center">
        When both players are ready, a 3-second countdown begins automatically.
      </p>
    </LobbyShell>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function LobbyShell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-24 pb-16">{children}</div>;
}

function PlayerCard({
  label,
  icon,
  youAreThisPlayer,
  present,
  ready,
}: {
  label: string;
  icon: React.ReactNode;
  youAreThisPlayer: boolean;
  present: boolean;
  ready: boolean;
}) {
  return (
    <div
      className={clsx(
        "rounded-2xl border bg-gray-900/40 backdrop-blur-sm p-5 transition-colors",
        present ? "border-gray-700/40" : "border-dashed border-gray-700/30 opacity-70",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gray-800/60 border border-gray-700/40">
            {icon}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-100">{label}</span>
              {youAreThisPlayer && (
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300">
                  You
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500">
              {present ? "Connected" : "Waiting…"}
            </div>
          </div>
        </div>
        {present && (
          <span
            className={clsx(
              "text-[11px] uppercase tracking-wider px-2 py-1 rounded-md",
              ready
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-400/30"
                : "bg-gray-800/60 text-gray-400 border border-gray-700/40",
            )}
          >
            {ready ? "Ready" : "Not ready"}
          </span>
        )}
      </div>
    </div>
  );
}

function ConnectionIndicator({ connected }: { connected: boolean }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1",
        connected ? "text-emerald-300/80" : "text-amber-300/80",
      )}
      title={connected ? "Connected to multiplayer server" : "Reconnecting…"}
    >
      {connected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
      <span className="normal-case">{connected ? "live" : "reconnecting"}</span>
    </span>
  );
}

function friendlySocketError(code: string): string {
  switch (code) {
    case "party_full":
      return "This party already has two players.";
    case "party_expired":
      return "This party has expired.";
    case "room_not_hydrated":
      return "Party hasn't finished setting up. Try again in a moment.";
    case "missing_player_id":
      return "Couldn't identify your browser. Refresh the page and try again.";
    case "player_id_mismatch":
      return "Identity mismatch on the multiplayer server. Refresh and try again.";
    default:
      return "Something went wrong with the multiplayer connection.";
  }
}
