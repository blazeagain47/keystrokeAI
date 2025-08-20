// src/components/feedback/AIFeedback.tsx
"use client";
import { useMemo } from "react";
import { rankForXP } from "@/utils/progression";
import { useStatsStore } from "@/stores/useStatsStore";
import { rankStyles, mapToRankTier, shouldShimmer } from "@/utils/rankStyles";

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

  // Source of truth for totals from stats store (history-derived)
  const totalXp = useStatsStore(s => s.totalXP) || 0;
  const streakDays = useStatsStore(s => s.streakDays) || 0;
  const rank = rankForXP(totalXp);

  // Prefer real totals from stats store only (single source of truth)

  return (
    <>
      {/* Heading */}
      <div className="text-xs uppercase tracking-widest text-white/70 mb-2">AI FEEDBACK</div>

      {/* Message */}
      <div className="text-white/90 leading-relaxed">
        {message}
      </div>

      {/* Rank / XP / Streak */}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        {(() => {
          const tier = mapToRankTier(rank.label);
          const st = rankStyles[tier];
          const shimmer = shouldShimmer(tier);
          return (
            <div
              className={`${shimmer ? 'rank-badge' : ''} text-white text-xs sm:text-sm font-semibold px-4 py-1 rounded-full`}
              style={{
                backgroundImage: `linear-gradient(90deg, ${st.start}, ${st.end}, ${st.start})`,
                boxShadow: `0 0 8px ${st.glow}`,
                border: `1px solid ${st.start}33`
              }}
            >
              {rank.label}
            </div>
          );
        })()}

        {totalXp > 0 && (
          <div className="text-xs sm:text-sm font-semibold px-3 py-1 rounded-full bg-white/5 border border-white/10">
            Total XP: <span className={`${shouldShimmer(mapToRankTier(rank.label)) ? 'rank-badge' : ''}`} style={{
              backgroundImage: shouldShimmer(mapToRankTier(rank.label)) ? `linear-gradient(90deg, ${rankStyles[mapToRankTier(rank.label)].start}, ${rankStyles[mapToRankTier(rank.label)].end}, ${rankStyles[mapToRankTier(rank.label)].start})` : undefined,
              WebkitBackgroundClip: shouldShimmer(mapToRankTier(rank.label)) ? 'text' as any : undefined,
              color: shouldShimmer(mapToRankTier(rank.label)) ? 'transparent' : undefined,
            }}>{totalXp}</span>
          </div>
        )}

        {streakDays > 0 && (
          <div className="px-3 py-1 rounded-full bg-white/5 text-gray-200 text-xs sm:text-sm border border-white/10">
            Streak: <span className="font-semibold">{streakDays}</span>
            <span className="text-white/70 text-xs ml-1">days</span>
          </div>
        )}
      </div>

      {/* Challenge */}
      <div className="rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-gray-200 mt-2">
        🎯 <span className="font-medium">Next challenge:</span> {challenge} <span className="opacity-80">(+{reward} XP)</span>
      </div>
    </>
  );
}


