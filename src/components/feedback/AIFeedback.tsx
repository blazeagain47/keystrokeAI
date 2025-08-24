// src/components/feedback/AIFeedback.tsx
"use client";
import { useMemo, useState } from "react";
import { rankForXP } from "@/utils/progression";
import { useStatsStore } from "@/stores/useStatsStore";
import { useTotalsStore } from "@/stores/useTotalsStore";
import { rankStyles, mapToRankTier, shouldShimmer } from "@/utils/rankStyles";
import { MicroSparkline } from "@/components/results/MicroSparkline";
import { WhyThis } from "@/components/results/WhyThis";
import { NextStepTile } from "@/components/results/NextStepTile";
import { ConfidenceMeter } from "@/components/results/ConfidenceMeter";
import { FocusTag } from "@/components/results/FocusTag";
import { ProjectedGain } from "@/components/results/ProjectedGain";
import { MetricChip } from "@/components/results/MetricChip";
import { DeltaChip } from "@/components/results/DeltaChip";
import { CoachPraise } from "@/components/results/CoachPraise";
import { correctionsPerMin, projectedWpmGain } from "@/lib/metrics";
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  peakFromSeries,
  consistencyFromSeries,
  baselineWpmFromHistory,
  RunSnapshot,
} from "@/lib/typingMetrics";
import { ShieldCheck, LineChart, Target } from "lucide-react";
// Inline chips here to avoid missing path issues if not compiled yet
import type { BlazeRun } from "@/lib/historyLocal";

type Props = {
  wpmTrend: number[];      // sequential WPM samples over the run (seconds)
  accuracyPct: number;     // 0–100
  completed: boolean;      // true when test finished
  /** finished run snapshot for better baselines */
  runSnapshot?: RunSnapshot | null;
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
  if (s.declining && acc < 95)  return "😬 Speed and accuracy dipped. Keep a steady cadence and reduce backspaces next run.";
  if (s.spread <= 4)            return "🎯 Rock‑solid consistency — your flow is smooth.";
  return "Keep the cadence steady — consistency + accuracy will push your WPM up.";
}

function nextChallenge(wpmTrend: number[], acc: number) {
  const last = wpmTrend.at(-1) ?? 0;
  const target = Math.ceil(last * 1.05); // +5% speed goal
  if (acc < 95) return { label: "Hit ≥95% accuracy next run", reward: 40 };
  return { label: `Beat ${target} WPM next run`, reward: 50 };
}

export default function AIFeedback({ wpmTrend, accuracyPct, completed, runSnapshot }: Props) {
  const [expanded, setExpanded] = useState(false);
  const message = useMemo(() => buildMessage(wpmTrend, accuracyPct), [wpmTrend, accuracyPct]);
  const { label: challenge, reward } = useMemo(() => nextChallenge(wpmTrend, accuracyPct), [wpmTrend, accuracyPct]);

  const totalXp = useTotalsStore(s => s.totalXP) || 0;
  const streakDays = useTotalsStore(s => s.streakDays) || 0;
  const hydrateTotals = useTotalsStore(s => s.hydrate);
  // lazy hydrate once mounted
  React.useEffect(() => { void hydrateTotals(); }, [hydrateTotals]);
  const rank = rankForXP(totalXp);

  // Prefer real totals from stats store only (single source of truth)

  // Light plumbing: derive simple deltas vs recent average (last 5 runs)
  const historyForBaseline = useStatsStore(s => s.history);
  const recent = Array.isArray(historyForBaseline) && historyForBaseline.length ? historyForBaseline.slice(-5) : [] as any[];
  const baselineWpm = baselineWpmFromHistory(recent as any[], runSnapshot ?? null);
  const currentWpm = Number(wpmTrend?.at(-1) ?? 0) || null; // fallback: last sampled WPM
  const currentAcc = Math.round(Number(accuracyPct) || 0);
  const deltaWpm = baselineWpm != null && currentWpm != null ? currentWpm - baselineWpm : null;
  const deltaAcc = null as number | null; // keep UI focused; accuracy chip shows absolute %
  const deltaFixes = null as number | null; // not tracked; omit unless available

  // 2.2 metrics and heuristics
  const wpmSeries = wpmTrend;
  // smooth metrics: 5s MA and ignore first 3s
  const peakWpm = wpmSeries?.length ? peakFromSeries(wpmSeries, { drop: 3, win: 5 }) : null;
  const stability = wpmSeries?.length ? consistencyFromSeries(wpmSeries, { drop: 3, win: 5 }) : null;
  const durationSec = wpmTrend?.length ?? null;
  const corrPerMin = null as number | null;
  const recentAvgFixes: number | null = null;
  const currentFixes: number | null = null;
  const projGain = projectedWpmGain(currentWpm, currentFixes, recentAvgFixes, 0.3);

  const focus: "Rhythm"|"Precision"|"Endurance" | null =
    (corrPerMin!=null && corrPerMin > 20) ? "Precision" :
    (stability!=null && stability < 55)   ? "Rhythm" :
    (durationSec!=null && durationSec >= 60) ? "Endurance" : "Rhythm";

  // Improved confidence: prefer duration + stability (fallback to delta heuristics)
  const confidence = (() => {
    const dur = Number(durationSec ?? 0);
    const stab = Number(stability ?? 0);
    if (dur >= 45 && stab >= 70) return "High" as const;
    if (dur >= 20 && stab >= 55) return "Medium" as const;
    // fallback to deltas when series is tiny
    const w = Math.abs(deltaWpm ?? 0);
    if (w >= 10) return "High" as const;
    if (w >= 5) return "Medium" as const;
    return "Low" as const;
  })();

  // Tiny helper: best time of day by grouping recent runs
  const historyAll = useStatsStore(s => s.history);
  const bestTimeOfDay = useMemo(() => {
    const runs = Array.isArray(historyAll) ? (historyAll as BlazeRun[]) : [];
    if (!runs.length) return null as string | null;
    const buckets = { morning: { sum: 0, n: 0 }, afternoon: { sum: 0, n: 0 }, evening: { sum: 0, n: 0 }, night: { sum: 0, n: 0 } };
    for (const r of runs.slice(-20)) {
      const ts = Number((r as any).ts ?? Date.now());
      const hr = new Date(ts).getHours();
      const wpm = Number((r as any).wpm ?? 0);
      if (!Number.isFinite(wpm)) continue;
      const key = hr >= 5 && hr < 12 ? "morning" : hr >= 12 && hr < 18 ? "afternoon" : hr >= 18 && hr < 23 ? "evening" : "night";
      buckets[key as keyof typeof buckets].sum += wpm; buckets[key as keyof typeof buckets].n++;
    }
    const entries = Object.entries(buckets).map(([k, v]) => ({ k, avg: v.n ? v.sum / v.n : -Infinity }));
    const best = entries.sort((a,b)=>b.avg-a.avg)[0];
    if (!best || best.avg === -Infinity) return null as string | null;
    const label = best.k === "morning" ? "morning" : best.k === "afternoon" ? "afternoon" : best.k === "evening" ? "evening" : "late night";
    return label;
  }, [historyAll]);

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
        {/* Confidence (with tooltip). Note: card title lives in parent container. */}
        <div className="flex items-center justify-end">
          <TooltipProvider delayDuration={200}>
            <UiTooltip>
              <TooltipTrigger asChild>
                <div>
                  <ConfidenceMeter level={confidence} />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {typeof durationSec === 'number' && durationSec > 0
                    ? `Short ${Math.round(durationSec)}s run / few samples.`
                    : "Limited data for this run."}
                </p>
              </TooltipContent>
            </UiTooltip>
          </TooltipProvider>
        </div>

        {/* INSIGHT */}
        <p className="mt-3 text-orange-100/95">{message}</p>

        {/* CHIPS */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {deltaWpm != null && Math.abs(deltaWpm) >= 0.5 && <DeltaChip label="WPM" delta={Math.round(deltaWpm)} />}
          {typeof accuracyPct === 'number' && isFinite(accuracyPct) && (
            <MetricChip
              icon={ShieldCheck}
              label="Accuracy"
              value={Math.round(accuracyPct)}
              suffix="%"
              tone={accuracyPct >= 95 ? "good" : accuracyPct >= 85 ? "neutral" : "warn"}
            />
          )}
          {stability!=null && Number.isFinite(stability) && <MetricChip icon={ShieldCheck} label="Consistency" value={Math.round(stability)} suffix="%" tone={stability>=75?"good":stability>=60?"neutral":"warn"} />}
          {peakWpm!=null && Number.isFinite(peakWpm) && <MetricChip icon={LineChart} label="Peak WPM" value={Math.round(peakWpm)} />}
          {corrPerMin!=null && <MetricChip icon={Target} label="Corrections" value={`${corrPerMin}`} suffix="/min" tone={corrPerMin<=12?"good":corrPerMin>20?"warn":"neutral"} />}
          {focus && <FocusTag focus={focus} />}
          {projGain!=null && projGain>0 && <ProjectedGain wpm={projGain} />}
        </div>

        {bestTimeOfDay && (
          <div className="mt-2 text-[11px] text-orange-200/70">You usually peak in the {bestTimeOfDay}.</div>
        )}

        {/* Details toggle */}
        <div className="mt-3">
          <button
            type="button"
            className="text-xs text-orange-200/80 hover:text-orange-100 underline"
            onClick={() => setExpanded(v => !v)}
          >
            {expanded ? "Hide details" : "Show details"}
          </button>
        </div>

        {expanded && (
            <div className="mt-3">
              {/* Sparkline (flat) */}
              {Array.isArray(wpmTrend) && wpmTrend.length > 3 && (
                <div className="mt-1">
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
        )}
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
            <span className="text-white/70 text-xs ml-1">{streakDays === 1 ? 'day' : 'days'}</span>
          </div>
        )}
      </div>

      <div className="ai-next-gap" aria-hidden />
    </>
  );
}


