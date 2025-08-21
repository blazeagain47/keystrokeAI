"use client";

import React from "react";
import { Flame, Zap, Target, Clock3, Activity } from "lucide-react";

type Props = {
  wpm: number;
  accuracy: number;     // 0-100
  durationSec: number;  // total test time in seconds
  consistency?: number; // optional % if you compute it
  keystrokes?: { correct: number; error: number }; // optional
  difficultyLabel?: string; // "Easy" | "Medium" | etc., optional
};

export default function ResultsStatsBar({
  wpm,
  accuracy,
  durationSec,
  consistency,
  keystrokes,
  difficultyLabel,
}: Props) {
  const items: Array<{
    icon: React.ReactNode;
    label: string;
    value: string;
    sub?: string;
  }> = [
    { icon: <Zap className="size-4" />, label: "WPM", value: Math.round(wpm).toString() },
    { icon: <Target className="size-4" />, label: "Accuracy", value: `${Math.round(accuracy)}%` },
    { icon: <Clock3 className="size-4" />, label: "Time", value: `${Math.round(durationSec)}s` },
  ];

  if (consistency != null) {
    items.push({ icon: <Activity className="size-4" />, label: "Consistency", value: `${Math.round(consistency)}%` });
  }
  // Mode is rendered as a dedicated glowing badge above; do not include in items
  if (keystrokes) {
    const total = (keystrokes.correct || 0) + (keystrokes.error || 0);
    items.push({
      icon: <Activity className="size-4" />,
      label: "Keystrokes",
      value: `${total}`,
      sub: `${keystrokes.correct ?? 0}✓  ${(keystrokes.error ?? 0)}✗`,
    });
  }

  return (
    <div
      className="
        relative w-full
        rounded-3xl border border-orange-500/20
        bg-gradient-to-r from-orange-500/10 via-amber-400/5 to-transparent
        backdrop-blur-sm shadow-[0_8px_40px_-10px_rgba(255,120,40,.25)]
        px-5 py-3 md:px-6 md:py-4
        overflow-hidden
      "
    >
      {/* subtle sparks */}
      <div className="pointer-events-none absolute inset-0 animate-sparks opacity-40" />

      {/* AI‑adapted tests badge with glow */}
      {difficultyLabel && (
        <div className="mb-3 md:mb-4">
          <div
            className="
              inline-flex items-center gap-2
              rounded-full px-3.5 py-1.5
              bg-gradient-to-r from-orange-500/20 via-amber-400/15 to-transparent
              ring-1 ring-orange-400/30
              shadow-[0_0_20px_rgba(255,125,35,.25)]
              ai-adapted-badge
            "
            title="Adaptive mode selected by AI"
          >
            <span className="relative inline-flex">
              <span className="absolute inset-0 rounded-full blur-[6px] bg-orange-400/40 animate-aiGlow" />
              <span className="relative block size-2 rounded-full bg-orange-400" />
            </span>
            <span className="text-[11px] uppercase tracking-wider text-orange-200/80">
              AI‑adapted tests:
            </span>
            <span className="text-sm font-semibold text-orange-100">
              {typeof difficultyLabel === 'string'
                ? difficultyLabel.slice(0,1).toUpperCase() + difficultyLabel.slice(1)
                : difficultyLabel}
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 md:gap-4">
        {items.map((it, i) => (
          <div
            key={i}
            className="
              group flex items-center gap-2
              rounded-2xl bg-black/10 px-3 py-2
              ring-1 ring-white/5 hover:ring-orange-400/40 transition
            "
          >
            <span className="text-orange-400">{it.icon}</span>
            <div className="leading-tight">
              <div className="text-[10px] uppercase tracking-wider text-orange-200/70">{it.label}</div>
              <div className="text-base md:text-lg font-semibold text-orange-100">{it.value}</div>
              {it.sub && <div className="text-[11px] text-orange-200/70">{it.sub}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


