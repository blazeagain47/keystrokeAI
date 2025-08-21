// src/components/feedback/AIFeedback.tsx
"use client";
import { useMemo } from "react";
import { rankForXP } from "@/utils/progression";
import { useStatsStore } from "@/stores/useStatsStore";
import { rankStyles, mapToRankTier, shouldShimmer } from "@/utils/rankStyles";
import { DeltaChip } from "@/components/results/DeltaChip";
import { MicroSparkline } from "@/components/results/MicroSparkline";
import { WhyThis } from "@/components/results/WhyThis";
import { NextStepTile } from "@/components/results/NextStepTile";
import { ConfidenceMeter } from "@/components/results/ConfidenceMeter";
import { FocusTag } from "@/components/results/FocusTag";
import { ProjectedGain } from "@/components/results/ProjectedGain";
import { MetricChip } from "@/components/results/MetricChip";
import { CoachPraise } from "@/components/results/CoachPraise";
import { seriesStats, stabilityIndex, correctionsPerMin, projectedWpmGain } from "@/lib/metrics";
import { LineChart, ShieldCheck, Target } from "lucide-react";

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

  // 2.2 metrics and heuristics
  const wpmSeries = wpmTrend;
  const s = seriesStats(wpmSeries);
  const peakWpm = s?.max ?? null;
  const stability = stabilityIndex(wpmSeries);
  const keystrokes: { correct?: number; error?: number } | null = null;
  const durationSec = wpmTrend?.length ?? null;
  const corrPerMin = correctionsPerMin(keystrokes?.correct, keystrokes?.error, durationSec);
  const recentAvgFixes: number | null = null;
  const currentFixes: number | null = null;
  const projGain = projectedWpmGain(currentWpm, currentFixes, recentAvgFixes, 0.3);

  const focus: "Rhythm"|"Precision"|"Endurance" | null =
    (corrPerMin!=null && corrPerMin > 20) ? "Precision" :
    (stability!=null && stability < 55)   ? "Rhythm" :
    (durationSec!=null && durationSec >= 60) ? "Endurance" : "Rhythm";

  const confidence = ((deltaWpm: number | null, deltaAcc: number | null) => {
    const w = Math.abs(deltaWpm ?? 0);
    const a = Math.abs(deltaAcc ?? 0);
    if (w >= 10 || a >= 4) return "High" as const;
    if (w >= 5 || a >= 2) return "Medium" as const;
    return "Low" as const;
  })(deltaWpm, deltaAcc);

  function pickPraise(): string {
    if (deltaWpm && deltaWpm > 0 && deltaAcc && deltaAcc >= 0) return "Great momentum—both speed and accuracy improved. Keep this rhythm!";
    if (deltaWpm && deltaWpm > 0) return "Nice speed lift. Keep a steady cadence to lock it in.";
    if (deltaAcc && deltaAcc > 0) return "Cleaner lines this run—fewer corrections. Excellent focus.";
    if (stability && stability >= 65) return "Consistent pace—this is how you build durable speed.";
    if (projGain && projGain >= 8) return "You’re close—trim a few corrections and the speed will follow.";
    return "Strong fundamentals—stay smooth and keep your hands relaxed.";
  }
  const coachPraise = pickPraise();

  return (
    <>
      {/* Single-surface card with 2.2 layout */}
      <div className="ai-card-surface relative p-4 md:p-5">
        {/* HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-orange-200 font-semibold">AI Feedback</h3>
            <span className="size-1 rounded-full bg-orange-300/60" />
            <span className="text-[11px] text-orange-200/70">Auto-generated coaching</span>
            <div className="ml-2">
              <ConfidenceMeter level={confidence} />
            </div>
          </div>
        </div>

        {/* INSIGHT */}
        <p className="mt-3 text-orange-100/95">{message}</p>

        {/* CHIPS */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {deltaWpm != null && <DeltaChip label="WPM" delta={Math.round(deltaWpm)} />}
          {typeof accuracyPct === 'number' && isFinite(accuracyPct) && (
            <MetricChip
              icon={ShieldCheck}
              label="Accuracy"
              value={Math.round(accuracyPct)}
              suffix="%"
              tone={accuracyPct >= 95 ? "good" : accuracyPct >= 85 ? "neutral" : "warn"}
            />
          )}
          {stability!=null && <MetricChip icon={ShieldCheck} label="Consistency" value={`${stability}`} suffix="%" tone={stability>=65?"good":"neutral"} />}
          {corrPerMin!=null && <MetricChip icon={Target} label="Corrections" value={`${corrPerMin}`} suffix="/min" tone={corrPerMin<=12?"good":corrPerMin>20?"warn":"neutral"} />}
          {peakWpm!=null && <MetricChip icon={LineChart} label="Peak WPM" value={Math.round(peakWpm)} />}
          {focus && <FocusTag focus={focus} />}
          {projGain!=null && projGain>0 && <ProjectedGain wpm={projGain} />}
        </div>

        {/* Sparkline (flat) */}
        {Array.isArray(wpmTrend) && wpmTrend.length > 3 && (
          <div className="mt-3">
            <MicroSparkline data={wpmTrend} flat={true} />
            <div className="mt-1 text-[11px] text-orange-200/60">WPM trend in last run</div>
          </div>
        )}

        {/* Why this? */}
        <WhyThis text={"Model-assisted summary based on speed and accuracy trend."} />

        {/* Coach praise */}
        <CoachPraise text={coachPraise} />

        {/* CTA */}
        <div className="mt-4">
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

      <div className="ai-next-gap" aria-hidden />
    </>
  );
}


