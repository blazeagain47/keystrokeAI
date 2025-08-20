// src/components/typing/ResultsPanel.tsx
"use client";

import * as React from "react";
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
} from "recharts";
import AIFeedback from "@/components/feedback/AIFeedback";
import BlazeFeedbackCard from "@/components/feedback/BlazeFeedbackCard";
import FireSummaryCard from "@/components/test/FireSummaryCard";
import CommandHintsFloating from "@/components/ui/CommandHintsFloating";
import NextTestButton from "@/components/ui/NextTestButton";
import { useStatsStore } from "@/stores/useStatsStore";
import { useAuth } from "@/hooks/useAuth";

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
}

const fmt = {
  x: (s: number) => `${s}s`,
  y: (v: number) => `${Math.round(v)}`,
};

export default function ResultsPanel(props: ResultsPanelProps) {
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

  const totalXpStore = useStatsStore(s => s.totalXP);
  const { user } = useAuth();
  const userStreak = user?.streak ?? 0;

  const wpmTrend: number[] = Array.isArray(wpmSeries) ? wpmSeries.map(p => p.wpm) : [];
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        try { e.preventDefault(); } catch {}
        if (typeof onNextTest === "function") onNextTest();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onNextTest]);
  // Normalize WPM values to 0..100 for sparkline animation
  const trendPercentages: number[] | undefined = (() => {
    if (!wpmTrend || wpmTrend.length < 2) return undefined;
    const min = Math.min(...wpmTrend);
    const max = Math.max(...wpmTrend);
    const range = Math.max(1, max - min);
    return wpmTrend.map(v => Math.round(((v - min) / range) * 100));
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
    <section className="relative z-[1] w-full mx-auto max-w-7xl px-4 md:px-6 bk-page-content" aria-label="Results">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* LEFT: Chart */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="min-h-[340px]"
        >
          <Card className="ks-card">
            <CardHeader className="pb-2">
              <div className="bk-chart-title mb-2">
                <CardTitle className="text-base md:text-lg font-semibold bk-wordmark">Typing Speed Trend</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-[260px] md:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={wpmSeries}>
                    <defs>
                      <linearGradient id="fireStroke" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#FF3D00" />
                        <stop offset="50%" stopColor="#FF6A00" />
                        <stop offset="100%" stopColor="#FFD36E" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
                    <XAxis
                      dataKey="second"
                      tickFormatter={fmt.x}
                      stroke="currentColor"
                      opacity={0.7}
                    >
                      <text x="50%" y="100%" dy={28} textAnchor="middle" className="fill-white/60 text-xs">Time (s)</text>
                    </XAxis>
                    <YAxis
                      domain={["auto", "auto"]}
                      tickFormatter={fmt.y}
                      stroke="currentColor"
                      opacity={0.7}
                    >
                      <text x={0} y={0} dx={12} dy={12} transform="rotate(-90)" textAnchor="middle" className="fill-white/60 text-xs">WPM</text>
                    </YAxis>
                    <Tooltip
                      content={<FireTooltipContent />}
                      cursor={{ stroke: "rgba(255,255,255,0.35)", strokeWidth: 1 }}
                      wrapperStyle={{ outline: "none" }}
                    />
                    {/* Fire-themed line + soft glow overlay */}
                    <Line
                      type="monotone"
                      dataKey="wpm"
                      dot={false}
                      activeDot={{ r: 4, className: "chart-point-glow" }}
                      stroke="url(#fireStroke)"
                      strokeWidth={2.5}
                      isAnimationActive={!prefersReducedMotion}
                      animationDuration={prefersReducedMotion ? 0 : 3000}
                      style={{ filter: "drop-shadow(0 0 6px rgba(255,80,0,0.4))" }}
                      onAnimationEnd={reveal}
                    />
                    <Line
                      type="monotone"
                      dataKey="wpm"
                      dot={false}
                      stroke="url(#fireStroke)"
                      strokeOpacity={0.25}
                      strokeWidth={7}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          {showNext && (
            <div className="mt-6 flex w-full justify-center">
              <NextTestButton onStart={() => { if (onNextTest) onNextTest(); }} autoFocus />
            </div>
          )}
        </motion.div>

        {/* RIGHT: Insights */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
          className="flex flex-col gap-6"
        >
          {/* Fire-themed AI feedback card */}
          <BlazeFeedbackCard
            rank={("" + (/* placeholder rank mapping */ "Master"))}
            message={<AIFeedback wpmTrend={wpmTrend} accuracyPct={accuracy} completed={true} />}
            xp={totalXpStore}
            streak={userStreak}
            challenge={"Beat your last WPM next run (+40 XP)"}
          />

          {/* Smart next test summary (fire-themed) */}
          {usedDifficulty && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut", delay: 0.08 }}
            >
              <FireSummaryCard
                difficulty={usedDifficulty}
                averageWPM={Math.round(Number(avgWpm ?? 0))}
                accuracy={Math.round(Number(avgAcc ?? 0))}
                knobs={nextKnobs ?? ["Punctuation off", "Numbers off"]}
                trend={trendPercentages}
                error={aiError}
                className={`mt-0 ${pulseGlow ? 'glow-boost' : ''}`}
              />
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Right-side commands (visible only on results screen) */}
      <CommandHintsFloating context="results" />
    </section>
  );
}

