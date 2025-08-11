// src/components/feedback/AIFeedback.tsx
"use client";
import { useMemo } from "react";
import { rankForXP, xpForRun, xpStore, streakStore } from "@/utils/progression";

type Props = {
  wpmTrend: number[];      // sequential WPM samples over the run (seconds)
  accuracyPct: number;     // 0–100
  completed: boolean;      // true when test finished
};

function summarize(wpmTrend: number[]) {
  if (!wpmTrend?.length) return { start: 0, end: 0, min: 0, max: 0, spread: 0, improving: false, declining: false };
  const start = wpmTrend[0];
  const end = wpmTrend[wpmTrend.length - 1];
  const min = Math.min(...wpmTrend);
  const max = Math.max(...wpmTrend);
  const spread = max - min;
  return {
    start, end, min, max, spread,
    improving: end > start + 2,
    declining: end < start - 2
  };
}

function buildMessage(wpmTrend: number[], acc: number) {
  const s = summarize(wpmTrend);
  if (s.improving && acc >= 98) return "🔥 You’re in the zone — speed and accuracy are elite.";
  if (s.improving && acc < 98)  return "🚀 Speed is climbing — tighten accuracy for a top score.";
  if (s.declining && acc >= 98) return "⚡ Precision is on point — reclaim early‑run speed next time.";
  if (s.declining && acc < 95)  return "😬 Both speed and accuracy dipped — focus on rhythm and fewer corrections.";
  if (s.spread <= 4)            return "🎯 Rock‑solid consistency — your flow is smooth.";
  return "Keep the cadence steady — consistency + accuracy will push your WPM up.";
}

function nextChallenge(wpmTrend: number[], acc: number) {
  const last = wpmTrend.at(-1) ?? 0;
  const target = Math.ceil(last * 1.05); // +5% speed goal
  if (acc < 95) return { label: "Hit ≥95% accuracy next run", reward: 40 };
  return { label: `Beat ${target} WPM next run`, reward: 50 };
}

export default function AIFeedback({ wpmTrend, accuracyPct, completed }: Props) {
  const message = useMemo(() => buildMessage(wpmTrend, accuracyPct), [wpmTrend, accuracyPct]);
  const { label: challenge, reward } = useMemo(() => nextChallenge(wpmTrend, accuracyPct), [wpmTrend, accuracyPct]);

  // When the run is completed, compute XP + update stores (idempotent per render pass).
  let xp = xpStore.read();
  let rank = rankForXP(xp);
  let streak = streakStore.read();

  if (completed) {
    const lastWpm = wpmTrend.at(-1) ?? 0;
    const gained = xpForRun(lastWpm, accuracyPct);
    xp = xpStore.bump(gained);
    rank = rankForXP(xp);
    streak = streakStore.inc();
  }

  return (
    <div className="mt-4 flex flex-col items-center gap-3">
      <div className="bg-gray-800/60 rounded-xl px-4 py-3 text-base sm:text-lg text-center shadow-md border border-white/5">
        <span className="text-yellow-300 font-semibold">💡 AI Feedback:</span> <span className="text-gray-100">{message}</span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <div className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-sm border border-emerald-500/30">
          Rank: <span className="font-semibold">{rank.label}</span>
        </div>
        <div className="px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-300 text-sm border border-indigo-500/30">
          Total XP: <span className="font-semibold">{xp}</span>
        </div>
        <div className="px-3 py-1 rounded-full bg-pink-500/15 text-pink-300 text-sm border border-pink-500/30">
          Streak: <span className="font-semibold">{streak}</span>
        </div>
      </div>

      <div className="bg-gray-900/60 rounded-lg px-3 py-2 text-sm text-gray-200 border border-white/5">
        🎯 <span className="font-medium">Next challenge:</span> {challenge} <span className="opacity-80">(+{reward} XP)</span>
      </div>
    </div>
  );
}


