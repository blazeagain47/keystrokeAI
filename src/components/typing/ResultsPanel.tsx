"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Zap, Target, Timer, ListChecks } from "lucide-react";
import { motion } from "framer-motion";

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
}

const fadeIn = {
  hidden: { opacity: 0, y: 8 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.35, delay: i } }),
};

export function ResultsPanel({ wpm, accuracy, time, analysis }: ResultsPanelProps) {
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Top stats row: 3 cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div variants={fadeIn} initial="hidden" animate="show" custom={0.05}>
          <Card className="rounded-2xl p-6 shadow-xl bg-card/80 backdrop-blur border border-border">
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
          <Card className="rounded-2xl p-6 shadow-xl bg-card/80 backdrop-blur border border-border">
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
          <Card className="rounded-2xl p-6 shadow-xl bg-card/80 backdrop-blur border border-border">
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
        <Card className="col-span-full rounded-2xl p-6 shadow-xl bg-card/80 backdrop-blur border border-border">
          <CardHeader className="flex items-center justify-between pb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">💡</span>
              <h3 className="text-base font-semibold">AI Feedback</h3>
            </div>
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

