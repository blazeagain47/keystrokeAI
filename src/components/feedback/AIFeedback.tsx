// src/components/feedback/AIFeedback.tsx
"use client";
import { useMemo } from "react";
import { rankForXP } from "@/utils/progression";
import { useStatsStore } from "@/stores/useStatsStore";
import { rankStyles, mapToRankTier, shouldShimmer } from "@/utils/rankStyles";
import { AIAura } from "@/components/results/AIAura";
import { DeltaChip } from "@/components/results/DeltaChip";
import { MicroSparkline } from "@/components/results/MicroSparkline";
import { WhyThis } from "@/components/results/WhyThis";
import { NextStepTile } from "@/components/results/NextStepTile";

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

  // Light plumbing: derive simple deltas vs recent average (last 5 runs)
  const history = useStatsStore(s => s.history);
  const recent = Array.isArray(history) && history.length ? history.slice(-5) : [] as any[];
  const recentAvgWpm = recent.length ? Math.round(recent.reduce((a, r) => a + (Number(r.wpm) || 0), 0) / recent.length) : null;
  const recentAvgAcc = recent.length ? Math.round(recent.reduce((a, r) => a + (Number(r.acc) || 0), 0) / recent.length) : null;
  const currentWpm = Number(wpmTrend?.at(-1) ?? 0) || null; // fallback: last sampled WPM
  const currentAcc = Math.round(Number(accuracyPct) || 0);
  const deltaWpm = recentAvgWpm != null && currentWpm != null ? currentWpm - recentAvgWpm : null;
  const deltaAcc = recentAvgAcc != null && Number.isFinite(currentAcc) ? currentAcc - recentAvgAcc : null;
  const deltaFixes = null as number | null; // not tracked; omit unless available

  // Confidence heuristic: higher if deltas are present and significant
  const confidence = (() => {
    const magnitude = Math.max(Math.abs(deltaWpm || 0), Math.abs(deltaAcc || 0));
    if (magnitude >= 5) return "High" as const;
    if (magnitude >= 2) return "Medium" as const;
    return "Low" as const;
  })();

  return (
    <>
      {/* Ember-glass container with AIAura header */}
      <div className="relative rounded-3xl border border-orange-500/15 bg-gradient-to-br from-orange-500/10 via-amber-400/5 to-transparent backdrop-blur-sm shadow-[0_8px_40px_-10px_rgba(255,120,40,.25)] ai-card-embers">
        <div className="p-4 md:p-5">
          <div className="flex items-start justify-between gap-3">
            <AIAura confidence={confidence} />
            {/* right-side rank badge retained below, not here */}
          </div>

          {/* Insight sentence */}
          <p className="mt-3 text-orange-100/95">{message}</p>

          {/* Deltas row (guarded) */}
          {(deltaWpm != null || deltaAcc != null || deltaFixes != null) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {deltaWpm != null && <DeltaChip label="WPM" delta={Math.round(deltaWpm)} />}
              {deltaAcc != null && <DeltaChip label="Accuracy" delta={Math.round(deltaAcc)} suffix="%" />}
              {deltaFixes != null && <DeltaChip label="Corrections" delta={Math.round(-deltaFixes)} />}
            </div>
          )}

          {/* Optional micro sparkline */}
          {Array.isArray(wpmTrend) && wpmTrend.length > 3 && (
            <div className="mt-3">
              <MicroSparkline data={wpmTrend} />
            </div>
          )}

          {/* Pills row: Novice / Total XP / Streak are rendered below (existing) */}

          {/* Explainability (placeholder-safe) */}
          <WhyThis text={"Model-assisted summary based on speed and accuracy trend."} />

          {/* Next step tile (friendly default) */}
          <NextStepTile title={"Precision drill (30s)"} xp={40} />
        </div>
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

      {/* spacer to preserve layout where the dark 'Next challenge' row used to be */}
      <div className="ai-next-gap" aria-hidden />
    </>
  );
}


