// src/components/typing/ResultsPanel.tsx
"use client";

import * as React from "react";
import { useMemo, useDeferredValue } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useOnVisible } from "@/lib/useOnVisible";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import AIFeedback from "@/components/feedback/AIFeedback";
import BlazeFeedbackCard from "@/components/feedback/BlazeFeedbackCard";
const AIFeedbackCardRevamp = dynamic(() => import("@/components/feedback/AIFeedbackCardRevamp"), {
  ssr: false,
  loading: () => <div className="p-5 rounded-xl border border-white/10 bg-white/5 animate-pulse h-[180px]" />
});
import FireSummaryCard from "@/components/test/FireSummaryCard";
import CommandHintsFloating from "@/components/ui/CommandHintsFloating";
import { useCommandsStore, type CommandAction } from "@/stores/commands";
import { useStatsStore } from "@/stores/useStatsStore";
import { useAuth } from "@/hooks/useAuth";
import { useTotalsStore } from "@/stores/useTotalsStore";
import ResultsStatsBar from "./ResultsStatsBar";
import { sanitizeWpmForChart } from "@/lib/typingMetrics";
import dynamic from "next/dynamic";
import AICoachCard from "@/components/ai/AICoachCard";
import { useAICoach } from "@/store/aiCoach";
import { ChartProbe } from "@/components/dev/ChartProbe";
import ResultsChart from "./ResultsChart";
import { Switch } from "@/components/ui/switch";
import * as Tooltip from "@/components/ui/tooltip";
import { useSettingsStore } from "@/store/settings";
import { useHydrated } from "@/lib/useHydrated";
import { mark } from "@/lib/perf";
import { tl } from "@/lib/timeline";
import { devLog } from "@/lib/devLog";
import { useQueueCount } from "@/hooks/useQueueCount";
import { officialWpm, accuracy as accFn, ema, dropFirstN, normalizePerSecond, stdev } from "@/lib/statsMath";
import useSyncing from "@/hooks/useSyncing";

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
  onPracticeWeakSpots?: () => void;
  onPracticeWeakSpotsTimed?: () => void; // NEW
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

}

const fmt = {
  x: (s: number) => `${s}s`,
  y: (v: number) => `${Math.round(v)}`,
};

export default function ResultsPanel(props: ResultsPanelProps) {
  const { registerGroup, setActiveGroup } = useCommandsStore();
  const chartBoxRef = React.useRef<HTMLDivElement>(null);

  const isHydrated = useHydrated();
  const blazeEnabled = useSettingsStore(s => s.test.blazeModeEnabled);

  const copyResults = React.useCallback(async () => {
    const text = `WPM: ${Math.round(Number(props.wpm ?? 0))}, Acc: ${Math.round(Number(props.accuracy ?? 0))}% — Time: ${Math.round(Number(props.time ?? 0))}s`;
    try { await navigator.clipboard.writeText(text); } catch {}
  }, [props.wpm, props.accuracy, props.time]);

  React.useEffect(() => {
    const actions: CommandAction[] = [
      { id: "restart", label: "Restart test", kbd: "Tab+Enter", run: () => { try { props.onNextTest?.(); } catch {} } },
      { id: "copy",    label: "Copy results", kbd: "C",           run: copyResults },
      ...(props.onPracticeWeakSpots ? [{ id: "coach30", label: "Practice weak spots (30 words)", run: () => { try { props.onPracticeWeakSpots?.(); } catch {} } }] as CommandAction[] : []),
      ...(props.onPracticeWeakSpotsTimed ? [{ id: "coach30s", label: "Practice weak spots (30 sec)", run: () => { try { props.onPracticeWeakSpotsTimed?.(); } catch {} } }] as CommandAction[] : []),
    ];
    registerGroup("postTest", actions);
    setActiveGroup("postTest");
  }, [registerGroup, setActiveGroup, copyResults, props.onNextTest, props.onPracticeWeakSpots, props.onPracticeWeakSpotsTimed]);
  React.useEffect(() => { mark('results:mount'); }, []);
  const {
    accuracy,
    analysis,
    wpmSeries = [],
    onNextTest,
    onPracticeWeakSpots,
    onPracticeWeakSpotsTimed,
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
  // Reveal the chart only when the card is scrolled into view
  const { ref: trendRef, visible: trendVisible } = useOnVisible<HTMLDivElement>({
    rootMargin: "0px 0px -120px 0px",
    threshold: 0.2,
  });

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
  const syncing = useSyncing();

  // Map sanitized series to chart data points
  const chartData = React.useMemo(
    () => Object.freeze(chartWpm.map((v, i) => ({ second: i + 1, wpm: Math.round(v) }))),
    [chartWpm]
  );

  // Debug logging for chart data
  console.log("[ResultsPanel] chartData preview", {
    n: chartData.length,
    preview: chartData.slice(0, 5)
  });

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

  return (
    <section className="relative z-[1] w-full mx-auto max-w-7xl px-4 md:px-6 bk-page-content results-scroll-root" aria-label="Results">

      <div className="grid grid-cols-12 gap-4 lg:gap-6 auto-rows-auto">
        {/* Top row: Blaze toggle + simple label */}
        <div className="col-span-12 -mb-2 flex items-center justify-between">
          <div className="text-sm font-medium opacity-80">Results</div>
          {isHydrated && (
            <Tooltip.TooltipProvider delayDuration={150}>
              <Tooltip.Tooltip>
                <Tooltip.TooltipTrigger asChild>
                  <div className="flex items-center gap-2 bg-gray-800/30 backdrop-blur-sm border border-gray-700/30 rounded-xl px-3 py-2">
                    <span className="text-xs uppercase tracking-wider text-gray-400">Blaze mode (AI)</span>
                    <Switch
                      checked={blazeEnabled}
                      onCheckedChange={(v) => {
                        useSettingsStore.getState().update("test", { blazeModeEnabled: !!v });
                        props.onNextTest?.(); // immediately regenerate with new mode
                      }}
                    />
                  </div>
                </Tooltip.TooltipTrigger>
                <Tooltip.TooltipContent>AI adapts your next test using your recent results.</Tooltip.TooltipContent>
              </Tooltip.Tooltip>
            </Tooltip.TooltipProvider>
          )}
        </div>
        {/* Top banner: Blaze stats full width */}
        {usedDifficulty && (
          <div className="col-span-12">
            {(() => {
              const resolvedLastRunConfig = props.usedConfig
                ? {
                    mode: props.usedConfig.mode,
                    wordCount: props.usedConfig.wordCount ?? null,
                    durationSec: props.usedConfig.durationSec ?? null,
                    language: props.usedConfig.language ?? 'english',
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
                  className={`${pulseGlow ? 'glow-boost' : ''} self-start`}
                  lastRunConfig={resolvedLastRunConfig}
                  headerSlot={null}
                  secondarySize="sm"
                  prepend={
                    <ResultsStatsBar
                      wpm={Number(props.wpm ?? 0)}
                      accuracy={Number(props.accuracy ?? 0)}
                      durationSec={Number(props.time ?? 0)}
                      consistency={Math.round(consistency)}
                      coachWpm={Math.round(coachWpm)}
                      difficultyLabel={undefined}
                      showBadge={false}
                      variant="compact"
                      size="lg"
                      equalWidth
                      bare
                      errorEvents={errorEvents}
                      errorFallback={errorFallback}
                    />
                  }
                />
              );
            })()}
          </div>
        )}

        {/* Middle row: Insights left, Coach right */}
        <div className="col-span-12 lg:col-span-6">
          <div className="cv-auto cv-300">
            <AIFeedbackCardRevamp
              wpmTrend={wpmTrend}
              accuracyPct={accuracy}
              completed={true}
              runSnapshot={props.usedConfig ?? null}
              onNextTest={onNextTest}
              onPracticeWeakSpots={onPracticeWeakSpots}
              onPracticeWeakSpotsTimed={onPracticeWeakSpotsTimed}
            />
          </div>
        </div>

        <div className="col-span-12 lg:col-span-6">
          {(onPracticeWeakSpots || onPracticeWeakSpotsTimed) && (() => {
            const coachStatus = useAICoach((s) => s.status);
            const coachDeltas = useAICoach((s) => s.lastDeltas);
            return (
              <div>
                <AICoachCard
                  onPractice={onPracticeWeakSpots ?? (() => {})}
                  onPracticeTimed={onPracticeWeakSpotsTimed}
                  state={coachStatus}
                  deltas={coachDeltas}
                />
              </div>
            );
          })()}
        </div>

        {/* Bottom: Trend full-width */}
        <div className="col-span-12 cv-auto cv-480">
          <Card className="bk-fire-card relative overflow-hidden isolate rounded-2xl h-full min-h-[432px]">
            <div aria-hidden className="bk-card-vignette pointer-events-none absolute inset-0" />
            <CardHeader className="pb-2 relative z-10">
              <div className="bk-chart-title mb-2">
                <CardTitle className="text-base md:text-lg font-semibold bk-title bk-title--glow">Typing Speed Trend</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-2 relative z-10">
              <motion.div
                ref={trendRef}
                className="h-[312px] md:h-[360px] pl-6 pr-2"
                initial={prefersReducedMotion ? undefined : { opacity: 0, y: 12 }}
                animate={prefersReducedMotion ? undefined : (trendVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 })}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <ResultsChart
                  chartData={chartData}
                  avg={chartAvgWpm}
                  finishSec={finishSec}
                  reducedMotion={prefersReducedMotion}
                  visible={trendVisible}
                  onFirstPaint={() => mark('chart:rendered')}
                />
              </motion.div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right-side commands (visible only on results screen) */}
      <CommandHintsFloating context="results" />
    </section>
  );
}

