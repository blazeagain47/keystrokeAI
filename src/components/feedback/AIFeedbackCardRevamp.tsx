// src/components/feedback/AIFeedbackCardRevamp.tsx
"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useStatsStore } from "@/stores/useStatsStore";
import { rankForXP } from "@/utils/progression";
import {
  consistencyFromSeries,
  peakFromSeries,
  baselineWpmFromHistory,
  RunSnapshot,
} from "@/lib/typingMetrics";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
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

type Props = {
  wpmTrend: number[];
  accuracyPct: number;
  completed: boolean;
  runSnapshot?: RunSnapshot | null;
  className?: string;
};

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

export default function AIFeedbackCardRevamp({ wpmTrend, accuracyPct, completed, runSnapshot, className }: Props) {
  const [viewMode, setViewMode] = useState<'quick' | 'detailed'>("quick");
  const prefersReducedMotion = useReducedMotion();

  const totalXp = useStatsStore(s => s.totalXP) || 0;
  const streakDays = useStatsStore(s => s.streakDays) || 0;
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
      className={`relative bg-gradient-to-br from-orange-900/70 via-gray-900 to-purple-900/80 rounded-xl border border-orange-500/30 shadow-2xl shadow-orange-500/10 p-5 overflow-hidden ${className ?? ""}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-orange-400/5 via-transparent to-purple-400/5" aria-hidden />

      <div className="relative z-10">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold bg-gradient-to-r from-orange-300 to-amber-300 bg-clip-text text-transparent">AI Insights</h3>
          <button
            onClick={() => setViewMode(v => (v === "quick" ? "detailed" : "quick"))}
            className="text-xs text-orange-300/70 hover:text-orange-300 transition-colors flex items-center gap-1"
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
                <div className="flex items-center gap-2 text-xs text-amber-200/80">
                  <span>Good {timeOfDay}!</span>
                  <span className="flex items-center gap-1"><Flame className="w-3 h-3" />{streakDays} day streak</span>
                </div>
                <p className="text-sm text-white/90 leading-relaxed">{feedbackMessage}</p>
                <div className="flex gap-3 justify-between">
                  <div className="flex items-center gap-1 text-xs"><Target className="w-3 h-3 text-green-400" /><span className="text-white/80">{Math.round(accuracyPct)}%</span></div>
                  <div className="flex items-center gap-1 text-xs"><Gauge className="w-3 h-3 text-blue-400" /><span className="text-white/80">{Math.round(currentWpm)} WPM</span></div>
                  <div className="flex items-center gap-1 text-xs"><TrendingUp className="w-3 h-3 text-purple-400" /><span className={deltaWpm && deltaWpm > 0 ? "text-green-400" : "text-rose-400"}>{deltaWpm!=null ? `${deltaWpm>0?"+":""}${Math.round(deltaWpm)}` : "--"}</span></div>
                </div>
                <div className="pt-2">
                  <div className="flex justify-between text-xs text-amber-200/70 mb-1">
                    <span>Next rank</span>
                    <span>{totalXp} / {rank.nextAt}</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-1.5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, Math.round((totalXp / Math.max(1, rank.nextAt)) * 100))}%` }}
                      transition={{ duration: prefersReducedMotion ? 0 : 0.8, ease: "easeOut" }}
                      className="h-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                    />
                  </div>
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
}: {
  wpmTrend: number[];
  accuracyPct: number;
  currentWpm: number;
  consistency: number;
  peakWpm: number;
  deltaWpm: number | null;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <MetricCard title="WPM" value={Math.round(currentWpm)} delta={deltaWpm} icon={<Gauge className="w-4 h-4" />} />
        <MetricCard title="Accuracy" value={Math.round(accuracyPct)} suffix="%" icon={<Target className="w-4 h-4" />} />
        <MetricCard title="Consistency" value={Math.round(consistency)} suffix="%" icon={<Sigma className="w-4 h-4" />} />
        <MetricCard title="Peak" value={Math.round(peakWpm)} icon={<ArrowUp className="w-4 h-4" />} />
      </div>

      <ExpandableSection
        title="Rhythm analysis"
        isExpanded={expanded === "rhythm"}
        onToggle={() => setExpanded(expanded === "rhythm" ? null : "rhythm")}
      >
        <div className="text-xs text-white/80 space-y-2">
          <p>Your typing rhythm was {consistency > 80 ? "consistent" : "variable"} throughout.</p>
          <div className="h-12">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={wpmTrend.map((wpm, i) => ({ second: i + 1, wpm }))}>
                <Area type="monotone" dataKey="wpm" stroke="#f97316" fill="url(#colorWpm)" />
                <defs>
                  <linearGradient id="colorWpm" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </ExpandableSection>

      <motion.div
        initial={prefersReducedMotion ? undefined : { opacity: 0, y: 10 }}
        animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
        className="p-3 bg-gradient-to-r from-orange-900/40 to-purple-900/40 rounded-lg border border-orange-500/20"
      >
        <h4 className="text-sm font-medium text-amber-300 mb-2 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Next challenge
        </h4>
        <p className="text-xs text-white/90 mb-2">Aim for a steady cadence and fewer corrections next run.</p>
        <button className="text-xs bg-gradient-to-r from-amber-500 to-orange-600 text-white px-3 py-1.5 rounded-md hover:shadow-lg transition-all">
          +40 XP
        </button>
      </motion.div>
    </div>
  );
}

function MetricCard({ title, value, delta, suffix, icon }: { title: string; value: number; delta?: number | null; suffix?: string; icon: React.ReactNode; }) {
  return (
    <motion.div whileHover={{ y: -2 }} className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-3 border border-gray-700/50">
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


