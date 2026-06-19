"use client";

import React, { useMemo } from "react";
import { ArrowLeft, Crown, Trophy, Minus, Hourglass, RefreshCw, Check } from "lucide-react";
import clsx from "clsx";

import ResultsStatsBar from "@/components/typing/ResultsStatsBar";
import type { FinalResult } from "@/lib/party/types";
import { usePartyStore } from "@/stores/usePartyStore";

interface PartyResultsProps {
  /** Local player id. */
  selfPlayerId: string;
  /** Opponent player id (may be null mid-disconnect). */
  opponentPlayerId: string | null;
  /** Send a rematch readiness toggle. */
  onPlayAgain: () => void;
  /** Leave the party entirely. */
  onLeave: () => void;
}

type Outcome = "win" | "lose" | "tie" | "waiting";

/**
 * Multiplayer results screen for a 1v1 party round. Reuses the solo
 * `ResultsStatsBar` for the per-player stat pills but deliberately avoids the
 * full solo `ResultsPanel` (which pulls in AI feedback, ads, solo stores, and
 * command registration). Renders a "waiting for opponent" state when only the
 * local result is in, and a play-again / rematch flow when the round is final.
 */
export default function PartyResults({
  selfPlayerId,
  opponentPlayerId,
  onPlayAgain,
  onLeave,
}: PartyResultsProps) {
  const results = usePartyStore((s) => s.live.results);
  const winnerId = usePartyStore((s) => s.live.winnerId);
  const rematchReady = usePartyStore((s) => s.live.rematchReady);
  const status = usePartyStore((s) => s.party?.status);

  const selfResult: FinalResult | undefined = results[selfPlayerId];
  const opponentResult: FinalResult | undefined = opponentPlayerId
    ? results[opponentPlayerId]
    : undefined;

  // The round is only "final" once the server has flipped to `finished`.
  // Until then (we finished but the opponent is still typing) we show a
  // non-final waiting state so partial data is never presented as the result.
  const isFinal = status === "finished" && !!selfResult && !!opponentResult;

  const outcome: Outcome = useMemo(() => {
    if (!isFinal) return "waiting";
    if (winnerId === null) return "tie";
    return winnerId === selfPlayerId ? "win" : "lose";
  }, [isFinal, winnerId, selfPlayerId]);

  const selfReady = !!rematchReady[selfPlayerId];
  const opponentReady = !!(opponentPlayerId && rematchReady[opponentPlayerId]);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-24 pb-16">
      {/* Header row */}
      <div className="flex items-center justify-between mb-8">
        <button
          type="button"
          onClick={onLeave}
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200"
          aria-label="Leave party"
        >
          <ArrowLeft className="h-4 w-4" />
          Leave party
        </button>
        <span className="text-xs uppercase tracking-wider text-gray-500">
          Race results
        </span>
      </div>

      {/* Winner banner */}
      <WinnerBanner outcome={outcome} />

      {/* Side-by-side player cards */}
      <section className="grid gap-4 sm:grid-cols-2 mt-6">
        <PlayerResultCard
          title="You"
          isSelf
          isWinner={isFinal && winnerId === selfPlayerId}
          result={selfResult}
        />
        <PlayerResultCard
          title="Opponent"
          isSelf={false}
          isWinner={isFinal && !!opponentPlayerId && winnerId === opponentPlayerId}
          result={opponentResult}
          waiting={!opponentResult}
        />
      </section>

      {/* Head-to-head delta */}
      {isFinal && selfResult && opponentResult && (
        <DeltaRow self={selfResult} opponent={opponentResult} />
      )}

      {/* Actions */}
      <section className="mt-8 flex flex-col items-center gap-3">
        {isFinal ? (
          <>
            <button
              type="button"
              onClick={onPlayAgain}
              aria-pressed={selfReady}
              className={clsx(
                "inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all",
                selfReady
                  ? "bg-emerald-500/20 border border-emerald-400/40 text-emerald-200"
                  : "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/20 hover:from-orange-400 hover:to-red-400",
              )}
            >
              {selfReady ? (
                <>
                  <Check className="h-4 w-4" />
                  Ready for rematch
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Play again
                </>
              )}
            </button>
            <p className="text-xs text-gray-500" aria-live="polite">
              {selfReady && !opponentReady
                ? "Waiting for opponent to accept the rematch…"
                : !selfReady && opponentReady
                ? "Opponent wants a rematch."
                : selfReady && opponentReady
                ? "Starting rematch…"
                : "Both players must choose Play again to start a new round."}
            </p>
          </>
        ) : (
          <p className="inline-flex items-center gap-2 text-sm text-gray-400">
            <Hourglass className="h-4 w-4 text-orange-300" />
            Waiting for your opponent to finish…
          </p>
        )}
      </section>
    </div>
  );
}

function WinnerBanner({ outcome }: { outcome: Outcome }) {
  const cfg = {
    win: {
      icon: <Trophy className="h-7 w-7 text-yellow-300" />,
      title: "You win!",
      cls: "from-yellow-500/15 to-orange-500/10 border-yellow-400/40 text-yellow-200",
    },
    lose: {
      icon: <Crown className="h-7 w-7 text-gray-400" />,
      title: "You lost",
      cls: "from-gray-700/30 to-gray-800/20 border-gray-600/40 text-gray-300",
    },
    tie: {
      icon: <Minus className="h-7 w-7 text-cyan-300" />,
      title: "It's a tie",
      cls: "from-cyan-500/15 to-blue-500/10 border-cyan-400/40 text-cyan-200",
    },
    waiting: {
      icon: <Hourglass className="h-7 w-7 text-orange-300" />,
      title: "Finished — waiting for opponent",
      cls: "from-orange-500/15 to-red-500/10 border-orange-400/40 text-orange-200",
    },
  }[outcome];

  return (
    <div
      className={clsx(
        "rounded-2xl border bg-gradient-to-r p-6 text-center flex flex-col items-center gap-2",
        cfg.cls,
      )}
    >
      <span className="inline-flex items-center justify-center">{cfg.icon}</span>
      <h2 className="text-2xl font-bold">{cfg.title}</h2>
    </div>
  );
}

function PlayerResultCard({
  title,
  isSelf,
  isWinner,
  result,
  waiting = false,
}: {
  title: string;
  isSelf: boolean;
  isWinner: boolean;
  result: FinalResult | undefined;
  waiting?: boolean;
}) {
  return (
    <div
      className={clsx(
        "rounded-2xl border bg-gray-900/40 backdrop-blur-sm p-5 transition-colors",
        isWinner ? "border-yellow-400/40" : "border-gray-700/40",
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-100">{title}</span>
          {isSelf && (
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300">
              You
            </span>
          )}
          {isWinner && (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-300 border border-yellow-400/30">
              <Trophy className="h-3 w-3" />
              Winner
            </span>
          )}
        </div>
        {result && !result.completed && (
          <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-md bg-rose-500/15 text-rose-300 border border-rose-400/30">
            DNF
          </span>
        )}
      </div>

      {result ? (
        <ResultsStatsBar
          wpm={result.finalWpm}
          accuracy={result.finalAccuracy}
          durationSec={
            result.finishTimeMs != null ? result.finishTimeMs / 1000 : 0
          }
          keystrokes={{
            correct: result.correctChars,
            error: result.incorrectChars,
          }}
          variant="compact"
          size="lg"
          bare
          showBadge={false}
          equalWidth
        />
      ) : (
        <div className="flex items-center gap-2 py-6 text-sm text-gray-500">
          <Hourglass className="h-4 w-4 text-orange-300" />
          {waiting ? "Still typing…" : "No result"}
        </div>
      )}
    </div>
  );
}

function DeltaRow({
  self,
  opponent,
}: {
  self: FinalResult;
  opponent: FinalResult;
}) {
  const wpmDelta = Math.round(self.finalWpm - opponent.finalWpm);
  const timeDelta =
    self.finishTimeMs != null && opponent.finishTimeMs != null
      ? (self.finishTimeMs - opponent.finishTimeMs) / 1000
      : null;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-gray-400">
      <span className="rounded-lg bg-white/5 border border-white/10 px-3 py-1.5">
        WPM diff:{" "}
        <span className={wpmDelta >= 0 ? "text-emerald-300" : "text-rose-300"}>
          {wpmDelta >= 0 ? `+${wpmDelta}` : wpmDelta}
        </span>
      </span>
      {timeDelta != null && (
        <span className="rounded-lg bg-white/5 border border-white/10 px-3 py-1.5">
          Time diff:{" "}
          <span className={timeDelta <= 0 ? "text-emerald-300" : "text-rose-300"}>
            {timeDelta <= 0
              ? `${timeDelta.toFixed(1)}s`
              : `+${timeDelta.toFixed(1)}s`}
          </span>
        </span>
      )}
    </div>
  );
}
