// src/components/typing/ResultsPanel.tsx
"use client";

import * as React from "react";
import { motion } from "framer-motion";
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
                      <linearGradient id="wpmLine" x1="0" x2="1" y1="0" y2="0">
                        <stop offset="0%" stopColor={`hsl(var(--primary))`} stopOpacity="0.95" />
                        <stop offset="100%" stopColor={`hsl(var(--primary))`} stopOpacity="0.6" />
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
                      formatter={(v: any) => [`${Math.round(Number(v))} wpm`, "WPM"]}
                      labelFormatter={(s: any) => `t = ${s}s`}
                    />
                    {/* Glow effect: primary line + faint overlay */}
                    <Line type="monotone" dataKey="wpm" dot={false} stroke="url(#wpmLine)" strokeWidth={3} isAnimationActive />
                    <Line type="monotone" dataKey="wpm" dot={false} stroke="url(#wpmLine)" strokeOpacity={0.25} strokeWidth={7} isAnimationActive={false} />
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

          {/* Smart next test knobs / summary */}
          {usedDifficulty && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut", delay: 0.08 }}
            >
              <div className="ks-card p-4 md:p-5 text-sm text-gray-200">
                <div className="mb-3">
                  <span className="ks-chip">
                    <span>Smart test</span>
                    <span className="opacity-70">adapted your next prompt</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                    <div className="text-[11px] uppercase opacity-70">Difficulty chosen</div>
                    <div className="font-medium">{usedDifficulty}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                    <div className="text-[11px] uppercase opacity-70">Your recent average</div>
                    <div className="font-medium">
                      {Math.round(Number(avgWpm ?? 0))} WPM • {Math.round(Number(avgAcc ?? 0))}% acc
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                    <div className="text-[11px] uppercase opacity-70">Next test knobs</div>
                    <div className="font-medium">
                      {flags?.punctuation === false ? "Punctuation off" : "Punctuation on"} •{" "}
                      {flags?.numbers === false ? "Numbers off" : "Numbers on"}
                    </div>
                  </div>
                </div>

                {analysis?.feedback && (
                  <div className="mt-3 text-xs/5 opacity-80">{analysis.feedback}</div>
                )}
              </div>
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
            onClick={() => onNextTest && onNextTest()}
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

