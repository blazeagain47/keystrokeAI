"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, WifiOff, UserX } from "lucide-react";
import clsx from "clsx";

import TypingBox from "@/components/typing/TypingBox";
import type { PartyClientHandle } from "@/lib/party/client";
import {
  createProgressSender,
  type ProgressSender,
} from "@/lib/party/progressSender";
import type { PartyTestConfig } from "@/lib/party/types";
import { usePartyStore } from "@/stores/usePartyStore";

import GhostCursor from "./GhostCursor";
import OpponentDebugHUD from "./OpponentDebugHUD";

interface PartyRaceProps {
  /** Shared test content from the party config — both players see the same. */
  testContent: string;
  /** Test config (mode, flags). MVP uses words mode only. */
  testConfig: PartyTestConfig;
  /** Local player id. */
  selfPlayerId: string;
  /** Opponent player id (host or guest depending on role); may be null mid-disconnect. */
  opponentPlayerId: string | null;
  /** Live PartyKit socket handle (owned by PartyLobby). */
  client: PartyClientHandle;
  /** Called when the user clicks "Leave race". */
  onLeave: () => void;
}

/**
 * Phase 4 race screen. Renders the existing TypingBox in `words` mode with
 * the shared party prompt, and forwards every local stat tick to PartyKit
 * as a throttled `progress` event. Receives `progress_relay` events
 * through the party store (dispatched by PartyLobby) and displays them in
 * the `OpponentDebugHUD`.
 *
 * Phase 4 deliberately does NOT render a ghost cursor and does NOT persist
 * final results. The TypingBox keystroke path is unmodified beyond a
 * single optional callback that is no-op when absent.
 */
export default function PartyRace({
  testContent,
  testConfig,
  selfPlayerId,
  opponentPlayerId,
  client,
  onLeave,
}: PartyRaceProps) {
  const clearOpponentProgress = usePartyStore((s) => s.clearOpponentProgress);
  const setOpponentDisconnected = usePartyStore((s) => s.setOpponentDisconnected);
  // Live presence/connection bits used for the in-race banners. These never
  // pause the typing engine — keystrokes stay local-first.
  const wsConnected = usePartyStore((s) => s.live.connected);
  const opponentDown = usePartyStore((s) => s.live.opponentDisconnected);

  // Collapsed state for the debug overlay so it can be minimised without
  // leaving the race. Default: expanded so it's immediately visible.
  const [debugExpanded, setDebugExpanded] = useState(true);

  // Sender is fire-and-forget. We re-create it whenever client identity
  // changes (e.g. after reconnect). Disposed on unmount.
  const senderRef = useRef<ProgressSender | null>(null);
  useEffect(() => {
    const sender = createProgressSender(client, selfPlayerId, {
      minMs: 90,
      maxMs: 250,
    });
    senderRef.current = sender;
    return () => {
      try {
        sender.dispose();
      } catch {}
      if (senderRef.current === sender) senderRef.current = null;
    };
  }, [client, selfPlayerId]);

  // Reset opponent progress + presence flag when this race screen mounts so
  // the HUD/banner don't show stale data from a previous run. Future
  // rematch flow will re-mount this component, which will reuse these
  // resets — keep them idempotent.
  useEffect(() => {
    clearOpponentProgress();
    setOpponentDisconnected(false);
    return () => {
      clearOpponentProgress();
      setOpponentDisconnected(false);
    };
  }, [clearOpponentProgress, setOpponentDisconnected]);

  // The party hook that gets handed to TypingBox. Defined here (not inline
  // in the JSX) so TypingBox doesn't see a new function on every render.
  const partyHook = useMemo(
    () => ({
      onProgress: (sample: {
        charIndex: number;
        correctChars: number;
        incorrectChars: number;
        wpm: number;
        accuracy: number;
        elapsedMs: number;
      }) => {
        const sender = senderRef.current;
        if (!sender) return;
        // submit() is synchronous, internally throttled, and never throws.
        sender.submit(sample);
      },
    }),
    [],
  );

  // TypingBox requires these. For Phase 4 we treat the test as informational
  // and don't push final results to PartyKit yet (that's Phase 6). We do
  // force a final progress frame on completion so the HUD lands on the
  // last sample without waiting for a trailing emit.
  const handleStatsUpdate = useCallback(
    (_wpm: number, _acc: number, _t: number) => {
      // Live stats are already routed via partyHook.onProgress (inside
      // TypingBox's keystroke batch). Nothing additional to do here.
    },
    [],
  );

  const handleTestComplete = useCallback(
    (wpm: number, accuracy: number, time: number, _typed: string) => {
      // Force one final progress sample so the opponent HUD shows the
      // final WPM/accuracy without waiting on the throttler's trailing emit.
      const sender = senderRef.current;
      if (sender) {
        sender.submit(
          {
            charIndex: testContent.length,
            correctChars: 0,
            incorrectChars: 0,
            wpm,
            accuracy,
            elapsedMs: Math.round(time * 1000),
          },
          { force: true },
        );
      }
      // Finish/persistence handled in Phase 6.
    },
    [testContent.length],
  );

  // Manual debug ping — proves the wire works even without typing. Useful
  // for QA: open both browsers, click this on Browser A, watch Browser B's
  // HUD increment its sequence counter.
  const handleDebugPing = useCallback(() => {
    const sender = senderRef.current;
    if (!sender) return;
    sender.submit(
      {
        charIndex: 0,
        correctChars: 0,
        incorrectChars: 0,
        wpm: 0,
        accuracy: 100,
        elapsedMs: 0,
      },
      { force: true },
    );
  }, []);

  const mode = testConfig.mode === "time" ? "time" : "words";
  const durationSec = testConfig.timeLimit ?? 15;

  // Defensive: the lobby should always hand us testContent, but if a stale
  // store + race condition lands us here with an empty string, show a safe
  // fallback rather than mounting TypingBox with no prompt.
  if (!testContent || testContent.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 pt-32 pb-16 text-center">
        <p className="text-amber-300/90">
          Couldn't load the shared race prompt. Try leaving and rejoining.
        </p>
        <button
          type="button"
          onClick={onLeave}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800/60 hover:bg-gray-700/70 border border-gray-700/40 text-sm text-gray-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Leave race
        </button>
      </div>
    );
  }

  return (
    <>
      {/*
       * TypingBox is the only flow-positioned element. It fills 100svh and
       * is designed to be rendered at the top level of the page, exactly as
       * in solo mode. We do NOT wrap it in an extra container with padding
       * or add flow siblings, because TypingBox's own paddingTop:13.75rem
       * accounts for the sticky app header and TypingBox locks page scroll.
       *
       * All party-specific controls live in fixed overlays so they are
       * always visible regardless of TypingBox's dimensions.
       */}
      <TypingBox
        mode={mode}
        durationSec={durationSec}
        prompt={testContent}
        onStatsUpdate={handleStatsUpdate}
        onTestComplete={handleTestComplete}
        party={partyHook}
      />

      {/*
       * Ghost cursor — fixed-position overlay that tracks the opponent's
       * latest charIndex in the shared prompt. Sits outside TypingBox's
       * `contain: layout` stacking context so viewport coordinates are
       * unaffected by TypingBox's internal translateY scroll transform.
       * Only rendered in party race mode.
       */}
      <GhostCursor
        selfPlayerId={selfPlayerId}
        opponentPlayerId={opponentPlayerId}
      />

      {/* ── Fixed top-left: Leave race ─────────────────────────────────── */}
      <div className="fixed top-4 left-4 z-[9999]">
        <button
          type="button"
          onClick={onLeave}
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 bg-gray-900/70 backdrop-blur-sm border border-gray-700/50 rounded-lg px-3 py-1.5 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Leave race
        </button>
      </div>

      {/* ── Fixed top-center: defensive non-blocking banners ───────────── */}
      {(!wsConnected || opponentDown) && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-1.5 items-center pointer-events-none"
          aria-live="polite"
        >
          {!wsConnected && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-200 bg-amber-500/15 border border-amber-400/40 rounded-md px-3 py-1 backdrop-blur-sm">
              <WifiOff className="h-3.5 w-3.5" />
              Reconnecting to multiplayer…
            </span>
          )}
          {opponentDown && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-rose-200 bg-rose-500/15 border border-rose-400/40 rounded-md px-3 py-1 backdrop-blur-sm">
              <UserX className="h-3.5 w-3.5" />
              Opponent disconnected — keep typing.
            </span>
          )}
        </div>
      )}

      {/* ── Fixed bottom-right: Phase 4 Debug overlay ─────────────────── */}
      <div
        className="fixed bottom-4 right-4 z-[9999] w-72 flex flex-col gap-0 rounded-2xl border border-cyan-400/30 bg-gray-950/90 backdrop-blur-md shadow-xl shadow-black/40 overflow-hidden"
      >
        {/* Overlay header — always visible */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800/60">
          <span className="text-[10px] uppercase tracking-widest text-cyan-400/80 font-semibold">
            Phase 4 Debug
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDebugPing}
              className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 text-cyan-200 transition-colors"
              title="Send a forced progress frame to the opponent"
            >
              Debug ping
            </button>
            <button
              type="button"
              onClick={() => setDebugExpanded((v) => !v)}
              className="text-gray-500 hover:text-gray-300 transition-colors"
              aria-label={debugExpanded ? "Collapse debug panel" : "Expand debug panel"}
            >
              {debugExpanded
                ? <ChevronDown className="h-3.5 w-3.5" />
                : <ChevronUp className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Collapsible body */}
        <div className={clsx(!debugExpanded && "hidden")}>
          <OpponentDebugHUD
            selfPlayerId={selfPlayerId}
            opponentPlayerId={opponentPlayerId}
          />
        </div>
      </div>
    </>
  );
}
