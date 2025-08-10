"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Zap, Target, Timer, ListChecks } from "lucide-react";
import { motion } from "framer-motion";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

type AnalysisResult = {
  input: string;
  corrections: string[];
  difficulty: string;
  feedback: string;
} | null;

interface ResultsPanelProps {
  wpm: number;
  accuracy: number;
  time: number;
  analysis: AnalysisResult;
  wpmSeries?: Array<{ second: number; wpm: number }>;
  onNextTest?: () => void | Promise<void>;
}

const fadeIn = {
  hidden: { opacity: 0, y: 8 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.35, delay: i } }),
};

export function ResultsPanel({ wpm, accuracy, time, analysis, wpmSeries = [], onNextTest }: ResultsPanelProps) {
  // Compute trend for badge: compare average of first 3 seconds vs last 3 seconds
  const hasTrend = wpmSeries.length >= 3;
  const average = (vals: number[]) => (vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0);
  const firstAvg = hasTrend ? average(wpmSeries.slice(0, 3).map((d) => d.wpm)) : 0;
  const lastAvg = hasTrend ? average(wpmSeries.slice(-3).map((d) => d.wpm)) : 0;
  let trendLabel = "→ Steady";
  let badgeClass = "bg-white/10 text-gray-300 border border-white/10";
  if (hasTrend && lastAvg > firstAvg) {
    trendLabel = "↑ Improving";
    badgeClass = "bg-green-500/15 text-green-300 border border-green-400/20";
  } else if (hasTrend && lastAvg < firstAvg) {
    trendLabel = "↓ Slowing";
    badgeClass = "bg-rose-500/15 text-rose-300 border border-rose-400/20";
  }
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Top stats row: 3 cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div variants={fadeIn} initial="hidden" animate="show" custom={0.05}>
          <Card className="rounded-2xl p-6 shadow-2xl bg-white/5 backdrop-blur-xl border border-white/10 ring-1 ring-white/10 relative">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <span className="text-sm uppercase text-muted-foreground">Words Per Minute</span>
              <span className="text-2xl" aria-hidden>⚡</span>
            </CardHeader>
            <CardContent>
              <div className="font-mono text-yellow-400 text-4xl font-extrabold tracking-tight" style={{textShadow: "0 0 18px rgba(250,204,21,0.25)"}}>
                {wpm}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeIn} initial="hidden" animate="show" custom={0.15}>
          <Card className="rounded-2xl p-6 shadow-2xl bg-white/5 backdrop-blur-xl border border-white/10 ring-1 ring-white/10 relative">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <span className="text-sm uppercase text-muted-foreground">Accuracy</span>
              <span className="text-2xl" aria-hidden>🎯</span>
            </CardHeader>
            <CardContent>
              <div className="font-mono text-lime-300 text-4xl font-extrabold tracking-tight" style={{textShadow: "0 0 18px rgba(190,242,100,0.25)"}}>
                {accuracy}%
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeIn} initial="hidden" animate="show" custom={0.25}>
          <Card className="rounded-2xl p-6 shadow-2xl bg-white/5 backdrop-blur-xl border border-white/10 ring-1 ring-white/10 relative">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <span className="text-sm uppercase text-muted-foreground">Time</span>
              <span className="text-2xl" aria-hidden>⏱</span>
            </CardHeader>
            <CardContent>
              <div className="font-mono text-cyan-300 text-4xl font-extrabold tracking-tight" style={{textShadow: "0 0 18px rgba(103,232,249,0.25)"}}>
                {time.toFixed(1)}s
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* AI Feedback full width */}
      <motion.div variants={fadeIn} initial="hidden" animate="show" custom={0.35}>
        <Card className="col-span-full rounded-2xl p-6 shadow-2xl bg-white/5 backdrop-blur-xl border border-white/10 ring-1 ring-white/10 relative overflow-hidden">
          {/* Glow background accents for glass depth */}
          <div className="pointer-events-none absolute -inset-10 bg-[radial-gradient(40rem_40rem_at_15%_0%,rgba(56,189,248,0.12),transparent_60%),radial-gradient(40rem_40rem_at_85%_20%,rgba(167,139,250,0.12),transparent_60%)] blur-3xl" />
          {/* WPM over time chart */}
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="mb-4 relative z-10"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                  📈 Typing Speed Trend
                </h3>
                <p className="text-sm text-muted-foreground mt-1">Your words per minute over time.</p>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium transition-transform duration-200 hover:scale-105 hover:brightness-110 ${badgeClass}`}
                aria-label="speed trend"
              >
                {trendLabel}
              </span>
            </div>
          </motion.div>
          <div className="mb-6">
            <div data-show={wpmSeries.length >= 2} className="transition-all duration-500 ease-out translate-y-4 opacity-0 data-[show=true]:translate-y-0 data-[show=true]:opacity-100">
              {wpmSeries.length >= 2 ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={wpmSeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="wpmGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#22d3ee" />
                          <stop offset="100%" stopColor="#a78bfa" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="second" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="wpm"
                        stroke="url(#wpmGradient)"
                        strokeWidth={3}
                        dot={false}
                        isAnimationActive={true}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ filter: 'drop-shadow(0 0 8px rgba(167,139,250,0.35))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Not enough data for trend.</p>
              )}
            </div>
          </div>
          <CardHeader className="flex items-center justify-between pb-4 relative">
            <div className="flex items-center gap-2">
              <span className="text-xl">💡</span>
              <h3 className="text-base font-semibold">AI Feedback</h3>
            </div>
            <button onClick={() => onNextTest && onNextTest()} className="text-sm rounded-lg px-3 py-1 border border-white/10 bg-white/5 backdrop-blur hover:bg-white/10">
              Next test
            </button>
            {analysis && (
              <span
                className={
                  analysis.difficulty === "Easy"
                    ? "px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-300 border border-green-400/30"
                    : analysis.difficulty === "Medium"
                    ? "px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-400/30"
                    : "px-2 py-1 text-xs rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/30"
                }
              >
                {analysis.difficulty}
              </span>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {analysis ? (
              <>
                <div>
                  <p className="text-sm uppercase text-muted-foreground mb-2">Corrections</p>
                  {analysis.corrections.length > 0 ? (
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {analysis.corrections.map((c, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <ListChecks className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No corrections detected.</p>
                  )}
                </div>

                <div className="text-sm bg-white/5 border border-white/10 rounded-lg p-3">
                  ✨ {analysis.feedback}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No analysis available.</p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default ResultsPanel;

