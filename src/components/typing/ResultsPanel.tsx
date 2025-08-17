// src/components/typing/ResultsPanel.tsx
"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import FireSummaryCard from "@/components/test/FireSummaryCard";

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

  const wpmTrend: number[] = Array.isArray(wpmSeries) ? wpmSeries.map(p => p.wpm) : [];
  const [pulseGlow, setPulseGlow] = React.useState(false);
  const prefersReducedMotion = useReducedMotion();
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

  return (
    <section className="relative z-[1] w-full mx-auto max-w-7xl px-4 md:px-6" aria-label="Results">
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
              <CardTitle className="text-base md:text-lg font-semibold">Typing Speed Trend</CardTitle>
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
                    />
                    <YAxis
                      domain={["auto", "auto"]}
                      tickFormatter={fmt.y}
                      stroke="currentColor"
                      opacity={0.7}
                    />
                    <Tooltip
                      wrapperClassName="chart-tooltip"
                      contentStyle={{ background: "transparent", border: "none", boxShadow: "none" }}
                      formatter={(v: any) => [
                        <span className="chart-tooltip-value" key="v">{`${Math.round(Number(v))} WPM`}</span>,
                        <span className="chart-tooltip-title" key="l">Speed</span>
                      ]}
                      labelFormatter={(s: any) => `Time = ${s}s`}
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
        </motion.div>

        {/* RIGHT: Insights */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
          className="flex flex-col gap-6"
        >
          {/* AIFeedback already includes rank/xp/streak; we just rely on its internal card styles */}
          <AIFeedback wpmTrend={wpmTrend} accuracyPct={accuracy} completed={true} />

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

      {/* CTA closer to grid */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
        className="mt-6 flex w-full items-center justify-center"
      >
        <div className="text-center">
          <Button
            onClick={async () => { setPulseGlow(true); setTimeout(() => setPulseGlow(false), 300); if (onNextTest) await onNextTest(); }}
            className="btn-glow px-6 md:px-8 py-6 text-base md:text-lg font-semibold rounded-2xl
                       bg-gradient-to-r from-primary/80 via-primary to-primary/80
                       ring-1 ring-primary/50 hover:ring-1 hover:ring-primary/35 shadow
                       transition-shadow duration-500"
          >
            Next test
          </Button>
          <div className="mt-2 text-xs opacity-70">
            Ready when you are — your progress carries over
          </div>
        </div>
      </motion.div>
    </section>
  );
}

