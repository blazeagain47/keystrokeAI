// src/components/feedback/AIFeedbackCardRevamp.tsx
"use client";

import * as React from "react";
import { useId, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useStatsStore } from "@/stores/useStatsStore";
import { useTotalsStore } from "@/stores/useTotalsStore";
import { rankForXP } from "@/utils/progression";
import {
  consistencyFromSeries,
  peakFromSeries,
  baselineWpmFromHistory,
  RunSnapshot,
} from "@/lib/typingMetrics";
import {
  ChevronRight,
  ChevronDown,
  Flame,
  Target,
  Gauge,
  TrendingUp,
  Zap,
  ArrowUp,
  Sigma,
} from "lucide-react";

import FireProgress from "@/components/ui/FireProgress";
import clsx from "clsx";

type Props = {
  wpmTrend: number[];
  accuracyPct: number;
  completed: boolean;
  runSnapshot?: RunSnapshot | null;
  className?: string;
  onNextTest?: () => void;
  onPracticeWeakSpots?: () => void;
  onPracticeWeakSpotsTimed?: () => void;
};

function RhythmSparkline({ values }: { values: number[] }) {
  const gradientId = useId().replace(/:/g, "");
  const geometry = useMemo(() => {
    const clean = values.filter(Number.isFinite);
    if (!clean.length) return null;

    const width = 160;
    const height = 48;
    const pad = 3;
    const min = Math.min(...clean);
    const max = Math.max(...clean);
    const span = Math.max(1, max - min);
    const points = clean.map((value, index) => {
      const x = clean.length === 1 ? width / 2 : pad + (index / (clean.length - 1)) * (width - pad * 2);
      const y = height - pad - ((value - min) / span) * (height - pad * 2);
      return [x, y] as const;
    });
    const line = points.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
    const first = points[0];
    const last = points[points.length - 1];
    const area = `${line} L${last[0].toFixed(2)} ${height} L${first[0].toFixed(2)} ${height} Z`;
    return { line, area, last };
  }, [values]);

  if (!geometry) {
    return <div className="h-12 rounded-lg bg-white/[0.03]" aria-label="No rhythm samples yet" />;
  }

  return (
    <svg
      viewBox="0 0 160 48"
      preserveAspectRatio="none"
      className="block size-full overflow-visible"
      role="img"
      aria-label={`Typing rhythm across ${values.length} samples`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fb923c" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#fb923c" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={geometry.area} fill={`url(#${gradientId})`} />
      <path d={geometry.line} fill="none" stroke="#fb923c" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <circle cx={geometry.last[0]} cy={geometry.last[1]} r="2.5" fill="#fdba74" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function buildMessage(wpmTrend: number[], acc: number) {
  if (!Array.isArray(wpmTrend) || !wpmTrend.length) return "Keep going—finish a full run for better insights.";
  const start = wpmTrend[0] ?? 0;
  const end = wpmTrend[wpmTrend.length - 1] ?? 0;
  const improving = end > start + 2;
  const declining = end < start - 2;
  if (improving && acc >= 98) return "🔥 You’re in the zone — speed and accuracy are elite.";
  if (improving && acc < 98)  return "🚀 Speed is climbing — tighten accuracy for a top score.";
  if (declining && acc >= 98) return "⚡ Precision is on point — reclaim early‑run speed next time.";
  if (declining && acc < 95)  return "😬 Speed and accuracy dipped. Keep a steady cadence and reduce backspaces next run.";
  return "Keep the cadence steady — consistency + accuracy will push your WPM up.";
}

// ---- Dynamic personalized feedback ----------------------------------------
type ErrorMetrics = {
  backspaceCount: number;
  commonErrors: string[];
  errorRate: number; // errors per minute
};

function deriveErrorData(lastRun: any, wpmTrend: number[]): ErrorMetrics {
  const durationSec = Number((lastRun?.durationSec ?? wpmTrend?.length ?? 0)) || 0;
  const raw = Array.isArray(lastRun?.events)
    ? lastRun.events
    : Array.isArray(lastRun?.keystrokes)
    ? lastRun.keystrokes
    : Array.isArray(lastRun?.keyLog)
    ? lastRun.keyLog
    : Array.isArray(lastRun?.keyEvents)
    ? lastRun.keyEvents
    : [];
  let backspaceCount = 0;
  let errorCount = 0;
  try {
    for (const e of raw) {
      const k = (e?.key ?? e?.char ?? e?.k ?? "").toString();
      if (k.toLowerCase() === "backspace") backspaceCount++;
      if (e?.isError || e?.error || e?.mistake) errorCount++;
    }
  } catch {}
  // bigrams/keys
  const bigrams = lastRun?.errorBigrams || {};
  const keys = lastRun?.mistypedKeys || lastRun?.errors || {};
  const commonErrors: string[] = (() => {
    const pairs: Array<[string, number]> = [];
    try { for (const k of Object.keys(bigrams)) pairs.push([k, Number((bigrams as any)[k] ?? 0)]); } catch {}
    try { for (const k of Object.keys(keys)) pairs.push([k, Number((keys as any)[k] ?? 0)]); } catch {}
    return pairs.sort((a,b)=> (b[1]||0)-(a[1]||0)).slice(0,3).map(p=>p[0]);
  })();
  const errorRate = durationSec > 0 ? Math.round((errorCount / durationSec) * 60) : 0;
  return { backspaceCount, commonErrors, errorRate };
}

function generatePersonalizedFeedback(
  wpmTrend: number[],
  accuracyPct: number,
  errorData: ErrorMetrics | null,
  userPatterns: any
): string {
  const start = wpmTrend[0] || 0;
  const end = wpmTrend[wpmTrend.length - 1] || 0;
  const improving = end > start + 2;
  const declining = end < start - 2;
  const consistency = consistencyFromSeries(wpmTrend);

  const backspaceCount = errorData?.backspaceCount || 0;
  const commonErrors = errorData?.commonErrors || [];
  const errorRate = errorData?.errorRate || 0;
  const durationSec = wpmTrend.length;

  const isShortSession = durationSec < 20;
  const highErrorRate = errorRate > 15;
  const manyBackspaces = backspaceCount > durationSec / 2;

  let primaryIssue: "accuracy"|"consistency"|"endurance"|"controlled"|"maintenance" = "maintenance";
  if (accuracyPct < 85) primaryIssue = "accuracy";
  else if (consistency < 60) primaryIssue = "consistency";
  else if (declining) primaryIssue = "endurance";
  else if (improving && accuracyPct < 95) primaryIssue = "controlled";

  let suggestion = "";
  switch (primaryIssue) {
    case "accuracy":
      if (manyBackspaces) suggestion = "Try to reduce backspacing by reading ahead and trusting your muscle memory.";
      else if (commonErrors.length > 0) suggestion = `Focus on the "${commonErrors[0]}" combination—it's your most frequent error.`;
      else if (highErrorRate) suggestion = "Slow down slightly to improve accuracy. Speed follows precision.";
      else suggestion = "Practice tougher texts to stress-test accuracy under pressure.";
      break;
    case "consistency":
      if (isShortSession) suggestion = "Try longer sessions to build steady rhythm and endurance.";
      else if (wpmTrend.filter(w => w < end * 0.7).length > 2) suggestion = "You had several big drops. Aim for a more even pace.";
      else suggestion = "Use a rhythmic drill to improve cadence stability.";
      break;
    case "endurance":
      if (end < start * 0.8) suggestion = "You faded late—start at a sustainable pace and finish strong.";
      else suggestion = "Build stamina with progressively longer sessions.";
      break;
    case "controlled":
      suggestion = "Speed is rising but accuracy dipped—nudge pace while keeping clean keystrokes.";
      break;
    default:
      {
        const encouragements = [
          "Excellent balance of speed and accuracy!",
          "Great consistency throughout your session!",
          "Impressive control and precision!",
          "You're maintaining excellent form!",
          "Outstanding rhythm and flow!",
        ];
        suggestion = encouragements[Math.floor(Math.random() * encouragements.length)];
      }
  }

  if (userPatterns?.bestTime && new Date().getHours() === userPatterns.bestTime) {
    suggestion += " You're practicing during your peak performance hours!";
  }

  let emoji = "";
  if (accuracyPct >= 95 && consistency >= 80) emoji = "🔥 ";
  else if (accuracyPct >= 90) emoji = "🚀 ";
  else if (accuracyPct >= 85) emoji = "⚡ ";
  else emoji = "🎯 ";

  return `${emoji}${suggestion}`;
}

export default function AIFeedbackCardRevamp({ wpmTrend, accuracyPct, completed, runSnapshot, className, onNextTest, onPracticeWeakSpots, onPracticeWeakSpotsTimed }: Props) {
  const [viewMode, setViewMode] = useState<'quick' | 'detailed'>("quick");
  const prefersReducedMotion = useReducedMotion();

  const totalXp = useTotalsStore(s => s.totalXP) || 0;
  const streakDays = useTotalsStore(s => s.streakDays) || 0;
  const totalsReady = useTotalsStore(s => s.ready);
  const hydrateTotals = useTotalsStore(s => s.hydrate);
  React.useEffect(() => { void hydrateTotals(); }, [hydrateTotals]);
  const history = useStatsStore(s => s.history);
  const rank = rankForXP(totalXp);

  const consistency = useMemo(() => consistencyFromSeries(wpmTrend), [wpmTrend]);
  const peakWpm = useMemo(() => peakFromSeries(wpmTrend), [wpmTrend]);
  const baselineWpm = useMemo(() => {
    const recent = Array.isArray(history) ? (history as any[]).slice(-5) : [];
    return baselineWpmFromHistory(recent as any, runSnapshot ?? null);
  }, [history, runSnapshot]);
  const currentWpm = Number(wpmTrend?.at(-1) ?? 0);
  const deltaWpm = baselineWpm != null ? currentWpm - (baselineWpm as number) : null;

  const currentHour = new Date().getHours();
  const timeOfDay = currentHour < 12 ? "morning" : currentHour < 17 ? "afternoon" : "evening";

  // Error metrics from last run (best-effort)
  const lastRun = Array.isArray(history) && history.length ? (history as any[])[(history as any[]).length - 1] : null;
  const errorData = useMemo<ErrorMetrics>(() => deriveErrorData(lastRun, wpmTrend), [lastRun, wpmTrend]);
  const feedbackMessage = useMemo(() => generatePersonalizedFeedback(wpmTrend, accuracyPct, errorData, null), [wpmTrend, accuracyPct, errorData]);

  return (
    <motion.div
      initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
      animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.5, ease: "easeOut" }}
      className={clsx(
        "relative bk-fire-card bk-card-sheen rounded-xl p-5 pb-4 overflow-hidden self-stretch h-full flex flex-col",
        "ring-1 ring-white/10 hover:ring-white/20 transition",
        className
      )}
    >
      {/* optional embers layer available via .bk-card-embers if desired */}

      <div className="relative z-10">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base md:text-lg font-semibold text-left bk-title bk-title--glow">AI Insights</h3>
          <button
            onClick={() => setViewMode(v => (v === "quick" ? "detailed" : "quick"))}
            aria-expanded={viewMode !== "quick"}
            className="text-xs inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-white/80 hover:border-white/20 transition"
          >
            {viewMode === "quick" ? "Show details" : "Show summary"}
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {viewMode === "quick" ? (
            <motion.div
              key="quick"
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 8 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -8 }}
            >
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs text-white/70">
                  {totalsReady ? (
                    <>
                      <span>Good {timeOfDay}!</span>
                      <span className="flex items-center gap-1"><Flame className="w-3 h-3" />{streakDays} day streak</span>
                    </>
                  ) : (
                    <span className="w-40 h-3 bg-white/10 rounded animate-pulse" />
                  )}
                </div>
                <p className="text-sm text-white/90 leading-relaxed whitespace-pre-line tabular-nums">{feedbackMessage}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bk-segment text-xs">
                    <Target className="w-3 h-3 opacity-80" />
                    <span className="tabular-nums">{Math.round(accuracyPct)}%</span>
                  </span>
                  <span className="bk-segment text-xs">
                    <Gauge className="w-3 h-3 opacity-80" />
                    <span className="tabular-nums">{Math.round(currentWpm)} WPM</span>
                  </span>
                  <span className="bk-segment text-xs">
                    <TrendingUp className="w-3 h-3 opacity-80" />
                    <span className={deltaWpm && deltaWpm > 0 ? "text-green-400 tabular-nums" : "text-rose-400 tabular-nums"}>
                      {deltaWpm!=null ? `${deltaWpm>0?"+":""}${Math.round(deltaWpm)}` : "--"}
                    </span>
                  </span>
                </div>
                <div className="pt-2">
                  {totalsReady ? (
                    <>
                      <div className="flex justify-between text-xs text-white/60 mb-1">
                        <span>Next rank</span>
                        <span className="tabular-nums">{totalXp} / {rank.nextAt}</span>
                      </div>
                      <div className="relative">
                        <FireProgress height={6} className="opacity-70" />
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, Math.round((totalXp / Math.max(1, rank.nextAt)) * 100))}%` }}
                          transition={{ duration: prefersReducedMotion ? 0 : 0.8, ease: "easeOut" }}
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                          style={{ height: 6 }}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-1.5 bg-white/10 rounded animate-pulse" />
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="detailed"
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 8 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -8 }}
            >
              <DetailedView
                wpmTrend={wpmTrend}
                accuracyPct={accuracyPct}
                currentWpm={currentWpm}
                consistency={consistency}
                peakWpm={peakWpm}
                deltaWpm={deltaWpm}
                onNextTest={onNextTest}
                onPracticeWeakSpots={onPracticeWeakSpots}
                onPracticeWeakSpotsTimed={onPracticeWeakSpotsTimed}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function DetailedView({
  wpmTrend,
  accuracyPct,
  currentWpm,
  consistency,
  peakWpm,
  deltaWpm,
  onNextTest,
  onPracticeWeakSpots,
  onPracticeWeakSpotsTimed,
}: {
  wpmTrend: number[];
  accuracyPct: number;
  currentWpm: number;
  consistency: number;
  peakWpm: number;
  deltaWpm: number | null;
  onNextTest?: () => void;
  onPracticeWeakSpots?: () => void;
  onPracticeWeakSpotsTimed?: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 items-stretch auto-rows-[1fr]">
        <div className="bk-inner-tile p-3 h-full"><MetricCard title="WPM" value={Math.round(currentWpm)} delta={deltaWpm} icon={<Gauge className="w-4 h-4" />} /></div>
        <div className="bk-inner-tile p-3 h-full"><MetricCard title="Accuracy" value={Math.round(accuracyPct)} suffix="%" icon={<Target className="w-4 h-4" />} /></div>
        <div className="bk-inner-tile p-3 h-full"><MetricCard title="Consistency" value={Math.round(consistency)} suffix="%" icon={<Sigma className="w-4 h-4" />} /></div>
        <div className="bk-inner-tile p-3 h-full"><MetricCard title="Peak" value={Math.round(peakWpm)} icon={<ArrowUp className="w-4 h-4" />} /></div>
      </div>

      {/* Sticky nudges to keep momentum */}
      <div className="flex flex-wrap items-center justify-between gap-2 md:gap-3 pt-1">
        <div className="text-[11px] text-white/60 flex items-center gap-2">
          Press <kbd className="px-1.5 py-0.5 rounded-md bg-white/10 border border-white/10 text-[10px]">Enter</kbd> to start next test
        </div>
        <div className="flex items-center gap-2">
          {onPracticeWeakSpots && (
            <button
              onClick={onPracticeWeakSpots}
              className="text-xs rounded-lg px-3 py-1.5 bg-amber-400 text-black hover:bg-amber-300"
            >
              Practice weak spots
            </button>
          )}
          {onPracticeWeakSpotsTimed && (
            <button
              onClick={onPracticeWeakSpotsTimed}
              className="text-xs rounded-lg px-3 py-1.5 bg-indigo-500 text-white hover:bg-indigo-500/90"
            >
              30 sec drill
            </button>
          )}
          {onNextTest && (
            <button
              onClick={onNextTest}
              className="text-xs rounded-lg px-3 py-1.5 bg-white/10 border border-white/10 hover:bg-white/15"
            >
              Start next
            </button>
          )}
        </div>
      </div>

      <ExpandableSection
        title="Rhythm analysis"
        isExpanded={expanded === "rhythm"}
        onToggle={() => setExpanded(expanded === "rhythm" ? null : "rhythm")}
      >
        <div className="bk-inner-tile p-3 text-xs text-white/80 space-y-2">
          <p>Your typing rhythm was {consistency > 80 ? "consistent" : "variable"} throughout.</p>
          <div className="h-12 relative">
            <div className="absolute inset-x-0 bottom-0 h-6 bk-chart-halo rounded-full pointer-events-none" />
            <RhythmSparkline values={wpmTrend} />
          </div>
        </div>
      </ExpandableSection>

      <motion.div
        initial={prefersReducedMotion ? undefined : { opacity: 0, y: 10 }}
        animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
        className="bk-inner-tile p-3"
      >
        <h4 className="text-sm font-medium text-amber-300 mb-2 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Next challenge
        </h4>
        <p className="text-xs text-white/90 mb-2">Aim for a steady cadence and fewer corrections next run.</p>
        <button className="text-xs bk-segment px-3 py-1.5 hover:ring-white/20 transition-all">
          +40 XP
        </button>
      </motion.div>
    </div>
  );
}

function MetricCard({ title, value, delta, suffix, icon }: { title: string; value: number; delta?: number | null; suffix?: string; icon: React.ReactNode; }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="h-full min-h-[120px] flex flex-col justify-between bg-gray-800/50 backdrop-blur-sm rounded-lg p-3 border border-gray-700/50"
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs text-gray-400">{title}</span>
        <div className="text-amber-400/80">{icon}</div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-semibold text-white">{value}</span>
        {suffix && <span className="text-xs text-gray-400">{suffix}</span>}
      </div>
      {delta != null && (
        <div className={`text-xs mt-1 ${delta >= 0 ? 'text-green-400' : 'text-rose-400'}`}>{delta >= 0 ? '↑' : '↓'} {Math.abs(Math.round(delta))}</div>
      )}
    </motion.div>
  );
}

function ExpandableSection({ title, isExpanded, onToggle, children }: { title: string; isExpanded: boolean; onToggle: () => void; children: React.ReactNode; }) {
  return (
    <div className="border-b border-gray-700/30 pb-3">
      <button onClick={onToggle} className="flex justify-between items-center w-full text-left">
        <span className="text-sm font-medium text-amber-200">{title}</span>
        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
            <div className="pt-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


