// src/components/typing/ResultsPanel.tsx
"use client";

import * as React from "react";
import { useMemo, useDeferredValue } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ReferenceDot,
} from "recharts";
import AIFeedback from "@/components/feedback/AIFeedback";
import BlazeFeedbackCard from "@/components/feedback/BlazeFeedbackCard";
const AIFeedbackCardRevamp = dynamic(() => import("@/components/feedback/AIFeedbackCardRevamp"), {
  ssr: false,
  loading: () => <div className="p-5 rounded-xl border border-white/10 bg-white/5 animate-pulse h-[180px]" />
});
import FireSummaryCard from "@/components/test/FireSummaryCard";
import CommandHintsFloating from "@/components/ui/CommandHintsFloating";
import NextTestButton from "@/components/ui/NextTestButton";
import { useStatsStore } from "@/stores/useStatsStore";
import { useAuth } from "@/hooks/useAuth";
import { useTotalsStore } from "@/stores/useTotalsStore";
import ResultsStatsBar from "./ResultsStatsBar";
import { sanitizeWpmForChart } from "@/lib/typingMetrics";
import dynamic from "next/dynamic";
const ResultsChart = dynamic(() => import("./ResultsChart"), {
  ssr: false,
  loading: () => <div className="h-[260px] md:h-[300px] w-full animate-pulse bg-white/5 rounded-lg" />
});
import { mark } from "@/lib/perf";
import { tl } from "@/lib/timeline";
import { devLog } from "@/lib/devLog";
import { useQueueCount } from "@/hooks/useQueueCount";
import { officialWpm, accuracy as accFn, ema, dropFirstN, normalizePerSecond, stdev } from "@/lib/statsMath";

export interface ResultsPanelProps {
  wpm: number;
  accuracy: number;
  time: number;
  analysis: {
    input: string;
    corrections: string[];
    difficulty: string;
    feedback: string;
  } | null;
  wpmSeries?: Array<{ second: number; wpm: number }>;
  onNextTest?: () => void | Promise<void>;
  usedDifficulty?: "easy" | "medium" | "hard";
  avgWpm?: number;
  avgAcc?: number;
  flags?: { punctuation?: boolean; numbers?: boolean };
  usedConfig?: {
    mode: "words" | "time" | "quote" | "zen" | "custom";
    wordCount?: number | null;
    durationSec?: number | null;
    include_punctuation?: boolean;
    include_numbers?: boolean;
    language?: string | null;
  };
  syncState?: "synced" | "queued" | "syncing" | "error";
}

const fmt = {
  x: (s: number) => `${s}s`,
  y: (v: number) => `${Math.round(v)}`,
};

export default function ResultsPanel(props: ResultsPanelProps) {
  React.useEffect(() => { mark('results:mount'); }, []);
  const {
    accuracy,
    analysis,
    wpmSeries = [],
    onNextTest,
    usedDifficulty,
    avgWpm,
    avgAcc,
    flags,
  } = props;

  // Diagnostic logging
  console.info('[bk:new] results= src/components/typing/ResultsPanel.tsx'); // remove after verification

  const totalXpStore = useStatsStore(s => s.totalXP);
  const { user } = useAuth();
  const userStreak = useTotalsStore(s => s.streakDays) || 0;
  const hydrateTotals = useTotalsStore(s => s.hydrate);
  React.useEffect(() => { void hydrateTotals(); }, [hydrateTotals]);

  const wpmTrendRaw: number[] = Array.isArray(wpmSeries)
    ? wpmSeries.map((p: any) => (typeof p === "number" ? p : Number(p?.wpm) || 0))
    : [];
  const deferredChart = useDeferredValue(wpmTrendRaw);
  const wpmTrend = deferredChart;

  // Normalize raw series and apply EMA smoothing with first-second drop for chart
  const { chartWpm, coachWpm, consistency } = React.useMemo(() => {
    const rawSeries = normalizePerSecond(
      wpmTrend.map((wpm, i) => ({ t: i, wpm }))
    ).map(s => s.wpm);

    // Drop first 1s to remove cold-start spike (chart only; KPIs unchanged)
    const chartSeries = dropFirstN(rawSeries, 1);
    const chartSeriesEma = ema(chartSeries, 0.3);

    // Coach WPM is the final EMA value, or fallback to official if no data
    const coachWpm = chartSeriesEma.length ? chartSeriesEma[chartSeriesEma.length - 1] : props.wpm;
    
    // Consistency % based on per-second variability
    const consistency = chartSeriesEma.length ? Math.max(0, 100 - stdev(chartSeriesEma)) : 0;

    return { chartWpm: chartSeriesEma, coachWpm, consistency };
  }, [wpmTrend, props.wpm]);
  const [pulseGlow, setPulseGlow] = React.useState(false);
  const prefersReducedMotion = useReducedMotion();
  const [showNext, setShowNext] = React.useState(false);
  const revealedRef = React.useRef(false);
  const reveal = React.useCallback(() => {
    if (!revealedRef.current) {
      revealedRef.current = true;
      setShowNext(true);
    }
  }, []);

  React.useEffect(() => {
    const id = window.setTimeout(reveal, prefersReducedMotion ? 300 : 3600);
    return () => window.clearTimeout(id);
  }, [reveal, prefersReducedMotion]);

  React.useEffect(() => {
    let tabHeld = false;
    let lastTabAt = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        // Keep focus in place on results; record Tab for combo detection
        tabHeld = true;
        lastTabAt = Date.now();
        try { e.preventDefault(); } catch {}
        return;
      }

      if (e.key === "Enter") {
        // Fire on bare Enter OR Tab+Enter pressed within a short window
        const withinWindow = Date.now() - lastTabAt <= 650;
        const allow = tabHeld ? withinWindow : true; // bare Enter allowed; Tab+Enter must be timely
        if (allow) {
          try {
            e.preventDefault();
            e.stopPropagation();
          } catch {}
          onNextTest?.();
          tabHeld = false;
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Tab") tabHeld = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [onNextTest]);
  // Normalize WPM values to 0..100 for sparkline animation
  const trendPercentages: number[] | undefined = (() => {
    if (!chartWpm || chartWpm.length < 2) return undefined;
    const min = Math.min(...chartWpm);
    const max = Math.max(...chartWpm);
    const range = Math.max(1, max - min);
    return chartWpm.map((v) => Math.round(((v - min) / range) * 100));
  })();
  const nextKnobs: string[] | undefined = (() => {
    if (!flags) return undefined;
    const parts: string[] = [];
    parts.push(flags.punctuation === false ? "Punctuation off" : "Punctuation on");
    parts.push(flags.numbers === false ? "Numbers off" : "Numbers on");
    return parts;
  })();
  const aiError: string | null = (() => {
    const msg = analysis?.feedback || "";
    return msg.includes("Could not fetch AI feedback.") ? msg : null;
  })();
  const qn = useQueueCount();

  // Map sanitized series to chart data points
  const chartData = React.useMemo(
    () => Object.freeze(chartWpm.map((v, i) => ({ second: i + 1, wpm: Math.round(v) }))),
    [chartWpm]
  );

  // (Dev) Debug toggle for series comparison
  React.useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEV_STATS_DEBUG === "1") {
      const rawSeries = normalizePerSecond(
        wpmTrend.map((wpm, i) => ({ t: i, wpm }))
      ).map(s => s.wpm);
      
      // eslint-disable-next-line no-console
      console.table({
        wpm_official: props.wpm,
        coach_last: Math.round(coachWpm),
        raw_len: rawSeries.length,
        chart_len: chartWpm.length,
        first5_raw: rawSeries.slice(0, 5),
        first5_chart: chartWpm.slice(0, 5).map(n => Math.round(n)),
      });
    }
  }, [wpmTrend, props.wpm, coachWpm, chartWpm]);

  // Debug logging for chart annotations (rename to avoid shadowing prop avgWpm)
  const chartAvgWpm = chartData.length ? chartData.reduce((s, p) => s + p.wpm, 0) / chartData.length : undefined;
  const peakPoint = chartData.length
    ? chartData.reduce(
        (acc, p) => (p.wpm > acc.wpm ? p : acc),
        { second: 0, wpm: -Infinity as number }
      )
    : { second: 0, wpm: -Infinity as number };
  const hasPeak = Number.isFinite(peakPoint.wpm);
  const finishSec = props.time ?? (chartData.length ? chartData[chartData.length - 1].second : undefined);
  
  console.debug("[bk] chart meta", { chartAvgWpm, peakPoint, finishSec, n: chartData.length });

  // Derive error tokens source from most recent run in history when available
  const historyAll = useStatsStore(s => s.history);
  const lastRun = useMemo(() => (Array.isArray(historyAll) && historyAll.length ? historyAll[historyAll.length - 1] : null), [historyAll]);
  const errorEvents = useMemo(() => {
    const raw = (lastRun as any)?.events ?? (lastRun as any)?.keystrokes ?? (lastRun as any)?.keyLog ?? (lastRun as any)?.keyEvents ?? [];
    return Array.isArray(raw)
      ? raw.map((e: any, i: number) => ({
          key: e?.key ?? e?.char ?? e?.k ?? "",
          isError: !!(e?.isError ?? e?.error ?? e?.mistake),
          prevKey: e?.prevKey ?? e?.prev ?? (i > 0 ? (raw[i - 1]?.key ?? raw[i - 1]?.char ?? null) : null),
        }))
      : [];
  }, [lastRun]);
  const errorFallback = useMemo(() => {
    const bigrams = (lastRun as any)?.errorBigrams ?? null;
    const keys = (lastRun as any)?.mistypedKeys ?? (lastRun as any)?.errors ?? null;
    return bigrams || keys ? { bigrams, keys } : null;
  }, [lastRun]);

  // Debug logging for error sources
  console.debug("[bk] error sources", {
    events: Array.isArray((lastRun as any)?.events) && (lastRun as any).events.length,
    keyEvents: Array.isArray((lastRun as any)?.keyEvents) && (lastRun as any).keyEvents.length,
    keystrokes: Array.isArray((lastRun as any)?.keystrokes) && (lastRun as any).keystrokes.length,
    keyLog: Array.isArray((lastRun as any)?.keyLog) && (lastRun as any).keyLog.length,
    bigrams: !!(lastRun as any)?.errorBigrams, 
    keys: !!((lastRun as any)?.mistypedKeys ?? (lastRun as any)?.errors),
  });

  function FireTooltipContent({ active, label, payload }: any) {
    if (!active || !payload || payload.length === 0) return null;
    const first = payload[0];
    const wpm = Math.round(Number(first?.value ?? 0));
    return (
      <div className="chart-tooltip">
        <div className="chart-tooltip-title">Time = {label}s</div>
        <div className="chart-tooltip-value">{wpm} WPM</div>
      </div>
    );
  }

  return (
    <section className="relative z-[1] w-full mx-auto max-w-7xl px-4 md:px-6 bk-page-content results-scroll-root" aria-label="Results">
      {/* Reordered: Blaze stats above the chart; keep two-column layout for chart + AI Feedback */}
      {/* Move Blaze stats summary above the two-column grid */}
      {usedDifficulty && (
        <div className="mb-2">
          {/*
            Build a normalized snapshot for the Blaze Stats card.
            Maps include_punctuation/include_numbers -> punctuation/numbers
          */}
          {(() => {
            const resolvedLastRunConfig = props.usedConfig
              ? {
                  mode: props.usedConfig.mode,
                  wordCount: props.usedConfig.wordCount ?? null,
                  durationSec: props.usedConfig.durationSec ?? null,
                  language: props.usedConfig.language ?? 'english',
                  // normalize flags for FireSummaryCard
                  punctuation: !!props.usedConfig.include_punctuation,
                  numbers: !!props.usedConfig.include_numbers,
                }
              : undefined;
            return (
              <FireSummaryCard
                difficulty={usedDifficulty}
                averageWPM={Math.round(Number(avgWpm ?? 0))}
                accuracy={Math.round(Number(avgAcc ?? 0))}
                knobs={nextKnobs ?? ["Punctuation off", "Numbers off"]}
                trend={trendPercentages}
                error={aiError}
                className={`mt-0 ${pulseGlow ? 'glow-boost' : ''}`}
                lastRunConfig={resolvedLastRunConfig}
              />
            );
          })()}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* LEFT: Chart */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="min-h-[340px] cv-auto cv-480"
        >
          {/* RESULTS STATS BAR (sits above the chart) */}
          <div className="mb-4 md:mb-5">
            <ResultsStatsBar
              wpm={Number(props.wpm ?? 0)}
              accuracy={Number(props.accuracy ?? 0)}
              durationSec={Number(props.time ?? 0)}
              consistency={Math.round(consistency)}
              coachWpm={Math.round(coachWpm)}
              difficultyLabel={props.usedDifficulty ? props.usedDifficulty : undefined}
              errorEvents={errorEvents}
              errorFallback={errorFallback}
            />
          </div>

          <Card className="ks-card">
            <CardHeader className="pb-2">
              <div className="bk-chart-title mb-2">
                <CardTitle className="text-base md:text-lg font-semibold bk-wordmark">Typing Speed Trend</CardTitle>
                {props.syncState && props.syncState !== "synced" && (
                  <span className="ml-2 rounded-full px-2 py-0.5 text-[11px] bg-amber-500/10 text-amber-300">
                    {props.syncState === "queued" ? "Queued (offline)" : props.syncState === "syncing" ? "Syncing…" : "Sync error"}
                  </span>
                )}
                {qn > 0 && (
                  <span className="ml-2 text-[10px] px-2 py-0.5 rounded bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">
                    syncing…
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-[260px] md:h-[300px]">
                <ResultsChart
                  chartData={chartData}
                  avg={chartAvgWpm}
                  finishSec={finishSec}
                  reducedMotion={prefersReducedMotion}
                  onFirstPaint={() => mark('chart:rendered')}
                />
              </div>
            </CardContent>
          </Card>
          {showNext && (
            <div className="mt-6 flex w-full justify-center">
              <NextTestButton onStart={() => { try { tl('results New test click'); } catch {} ; try { devLog('results New test click'); } catch {} ; if (onNextTest) onNextTest(); }} autoFocus />
            </div>
          )}
        </motion.div>

        {/* RIGHT: Insights */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
          className="flex flex-col gap-6 cv-auto cv-300"
        >
          {/* Revamped AI feedback card */}
          <AIFeedbackCardRevamp
            wpmTrend={wpmTrend}
            accuracyPct={accuracy}
            completed={true}
            runSnapshot={props.usedConfig ?? null}
          />

          {/* This test card (duplicate at bottom) — removed per design */}
        </motion.div>
      </div>

      {/* Right-side commands (visible only on results screen) */}
      <CommandHintsFloating context="results" />
    </section>
  );
}

