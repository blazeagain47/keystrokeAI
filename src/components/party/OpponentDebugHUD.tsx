"use client";

import React, { useEffect, useState } from "react";
import { Activity, Wifi, WifiOff } from "lucide-react";
import clsx from "clsx";

import { usePartyStore } from "@/stores/usePartyStore";

interface OpponentDebugHUDProps {
  /** Local player id — used to find the *opponent* entry in the store. */
  selfPlayerId: string;
  /**
   * Optional explicit opponent player id. If absent, we pick the first
   * entry in `live.opponentProgress` that isn't us. (In a 1v1 there is at
   * most one.)
   */
  opponentPlayerId?: string | null;
}

/**
 * Phase 4 debug HUD. Shows the latest received `progress_relay` for the
 * opponent — charIndex, WPM, accuracy, sequence, last-update age — plus
 * the local socket's connection state. This component is a *reader only*;
 * it never sends anything. It exists to prove the live progress wire is
 * working before the visual ghost cursor lands in Phase 5.
 */
export default function OpponentDebugHUD({
  selfPlayerId,
  opponentPlayerId,
}: OpponentDebugHUDProps) {
  const opponentProgress = usePartyStore((s) => s.live.opponentProgress);
  const connected = usePartyStore((s) => s.live.connected);
  const party = usePartyStore((s) => s.party);

  // Determine the opponent's playerId. Prefer the explicit prop; fall back
  // to whichever slot isn't us; finally fall back to "any entry that isn't
  // us in the opponentProgress map" (covers reconnect timing).
  const resolvedOpponentId = (() => {
    if (opponentPlayerId) return opponentPlayerId;
    if (party) {
      if (party.role === "host" && party.guestId && party.guestId !== selfPlayerId) {
        return party.guestId;
      }
      if (party.role === "guest" && party.hostId !== selfPlayerId) {
        return party.hostId;
      }
    }
    for (const pid of Object.keys(opponentProgress)) {
      if (pid !== selfPlayerId) return pid;
    }
    return null;
  })();

  const entry = resolvedOpponentId ? opponentProgress[resolvedOpponentId] : null;

  // Tick a re-render every 250ms so the "last update Xs ago" stays fresh
  // even when no new progress frames arrive.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => (t + 1) % 1_000_000), 250);
    return () => window.clearInterval(id);
  }, []);

  const now = Date.now();
  const ageMs = entry ? Math.max(0, now - entry.receivedAt) : null;
  const ageLabel = ageMs == null
    ? "—"
    : ageMs < 1000
    ? `${ageMs}ms ago`
    : `${(ageMs / 1000).toFixed(1)}s ago`;

  const stale = ageMs != null && ageMs > 2_000;

  return (
    <div data-testid="opponent-debug-hud" className="p-4">
      {/* Opponent ID + connection row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-cyan-400/70 flex-shrink-0" />
          <span className="text-[11px] text-gray-500 font-mono">
            {resolvedOpponentId
              ? `${resolvedOpponentId.slice(0, 12)}…`
              : <span className="text-gray-600 italic">no opponent id yet</span>}
          </span>
        </div>
        <span
          className={clsx(
            "inline-flex items-center gap-1 text-[10px] uppercase tracking-wider",
            connected ? "text-emerald-300/80" : "text-amber-300/80",
          )}
          title={connected ? "Local socket connected" : "Reconnecting…"}
        >
          {connected
            ? <Wifi className="h-3 w-3" />
            : <WifiOff className="h-3 w-3" />}
          {connected ? "live" : "reconnecting"}
        </span>
      </div>

      {/* Empty state — shown before the first progress_relay arrives */}
      {!entry && (
        <div className="rounded-xl border border-dashed border-gray-700/50 py-4 px-3 text-center">
          <p className="text-[11px] text-gray-500 leading-relaxed">
            Waiting for opponent progress…
            <br />
            <span className="text-gray-600">
              Click "Debug ping" to send a test frame.
            </span>
          </p>
        </div>
      )}

      {/* Live stats grid — shown once first progress_relay arrives */}
      {entry && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
          <Stat label="charIndex" value={entry.sample.charIndex} />
          <Stat label="WPM" value={entry.sample.wpm} />
          <Stat label="accuracy" value={`${Math.round(entry.sample.accuracy)}%`} />
          <Stat label="sequence" value={entry.sample.sequence} />
          <Stat label="correct" value={entry.sample.correctChars} />
          <Stat label="incorrect" value={entry.sample.incorrectChars} />
          <Stat
            label="elapsed"
            value={`${(entry.sample.elapsedMs / 1000).toFixed(1)}s`}
          />
          <Stat
            label="last update"
            value={
              <span className={clsx(stale && "text-amber-300")}>{ageLabel}</span>
            }
          />
        </dl>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-gray-800/40 pb-1">
      <dt className="uppercase tracking-wider text-gray-600">{label}</dt>
      <dd className="font-mono text-gray-200 tabular-nums">{value}</dd>
    </div>
  );
}
