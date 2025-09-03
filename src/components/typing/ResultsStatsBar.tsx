"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Flame, Zap, Target, Clock3, Activity } from "lucide-react";
import { computeTopErrorTokens } from "@/lib/typing/errors";

type Props = {
  wpm: number;
  accuracy: number;     // 0-100
  durationSec: number;  // total test time in seconds
  consistency?: number; // optional % if you compute it
  coachWpm?: number;    // optional EMA-smoothed WPM metric
  keystrokes?: { correct: number; error: number }; // optional
  difficultyLabel?: string; // "Easy" | "Medium" | etc., optional
  errorEvents?: Array<{ key: string; isError?: boolean; prevKey?: string | null } | null> | null;
  errorFallback?: { bigrams?: Record<string, number>; keys?: Record<string, number> } | null;
  className?: string;
};

type VariantProps = {
  variant?: 'default'|'compact';
  bare?: boolean;
  showBadge?: boolean;
};

export default function ResultsStatsBar({
  wpm,
  accuracy,
  durationSec,
  consistency,
  coachWpm,
  keystrokes,
  difficultyLabel,
  errorEvents,
  errorFallback,
  className,
  variant = 'default',
  bare = false,
  showBadge = true,
}: Props & VariantProps) {
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

  // Show Consistency before Coach WPM
  if (consistency != null) {
    items.push({
      icon: <Activity className="size-4" />,
      label: "Consistency",
      value: `${Math.round(consistency)}%`,
    });
  }

  if (coachWpm != null && coachWpm !== wpm) {
    items.push({
      icon: <Flame className="size-4" />,
      label: "Coach WPM (EMA)",
      value: Math.round(coachWpm).toString(),
      sub: "EMA smoothed speed. Official WPM remains unchanged.",
    });
  }

  if (keystrokes) {
    const total = (keystrokes.correct || 0) + (keystrokes.error || 0);
    items.push({
      icon: <Activity className="size-4" />,
      label: "Keystrokes",
      value: `${total}`,
      sub: `${keystrokes.correct ?? 0}✓  ${(keystrokes.error ?? 0)}✗`,
    });
  }

  const prettyDifficulty =
    typeof difficultyLabel === "string"
      ? difficultyLabel.slice(0, 1).toUpperCase() + difficultyLabel.slice(1)
      : difficultyLabel;

  const pad = variant === 'compact' ? "px-3 py-1.5 md:px-4 md:py-2" : "p-0";
  const pillBase = variant === 'compact'
    ? "rounded-xl bg-white/5 border border-white/10 px-2.5 py-1.5 hover:border-white/20"
    : "rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 hover:border-white/20";
  const gapCls = variant === 'compact' ? "gap-2 md:gap-3" : "gap-3 md:gap-4";

  if (bare) {
    return (
      <div className={cn("w-full", pad, className)}>
        {/* Optional badge/title (hidden when showBadge=false) */}
        {showBadge && prettyDifficulty && (
          <div className="mb-3 md:mb-4">
            <div
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 bg-white/10 ring-1 ring-white/10"
              title="Adaptive mode selected by AI"
            >
              <span className="relative inline-flex">
                <span className="absolute inset-0 rounded-full blur-[6px] bg-amber-400/40 animate-aiGlow" />
                <span className="relative block size-2 rounded-full bg-amber-400" />
              </span>
              <span className="text-[11px] uppercase tracking-wider text-white/70">AI-adapted tests:</span>
              <span className="text-sm font-semibold text-white">{prettyDifficulty}</span>
            </div>
          </div>
        )}

        <div className={cn("flex flex-wrap items-center", gapCls)}>
          {items.map((it, i) => (
            <div key={i} className={cn("group flex items-center gap-2", pillBase)}>
              <span
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10 group-hover:ring-white/20"
                aria-hidden
              >
                <span className="text-white/80">{it.icon}</span>
              </span>
              <div className="leading-tight">
                <div className="text-[10px] uppercase tracking-wider text-white/60">{it.label}</div>
                <div className="text-lg sm:text-xl font-semibold bk-fire-text">{it.value}</div>
                {it.sub && <div className="text-[11px] text-white/60">{it.sub}</div>}
                {it.label === "Accuracy" && (() => {
                  const toks = computeTopErrorTokens(errorEvents as any, errorFallback as any, 3);
                  if (!toks || toks.length === 0) return null;
                  return (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {toks.map((t) => (
                        <span key={t} className="px-2 py-0.5 text-xs rounded-full bg-white/6 border border-white/12" title={t === " " ? "space" : t}>
                          {t === " " ? "␣" : t}
                        </span>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Card
      className={cn(
        "bk-fire-card bk-card-sheen relative overflow-hidden isolate rounded-2xl",
        className
      )}
      aria-label='AI-adapted tests summary'
    >
      <div aria-hidden className="bk-card-vignette pointer-events-none absolute inset-0" />
      <CardContent className="relative z-10 p-4 sm:p-5">
        {showBadge && prettyDifficulty && (
          <div className="mb-3 md:mb-4">
            <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 bg-white/10 ring-1 ring-white/10" title="Adaptive mode selected by AI">
              <span className="relative inline-flex">
                <span className="absolute inset-0 rounded-full blur-[6px] bg-amber-400/40 animate-aiGlow" />
                <span className="relative block size-2 rounded-full bg-amber-400" />
              </span>
              <span className="text-[11px] uppercase tracking-wider text-white/70">AI-adapted tests:</span>
              <span className="text-sm font-semibold text-white">{prettyDifficulty}</span>
            </div>
          </div>
        )}

        <div className={cn("flex flex-wrap items-stretch", gapCls)}>
          {items.map((it, i) => (
            <div key={i} className={cn("group flex items-center gap-3", pillBase)}>
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10 group-hover:ring-white/20" aria-hidden>
                <span className="text-white/80">{it.icon}</span>
              </span>
              <div className="leading-tight">
                <div className="text-[10px] uppercase tracking-wider text-white/60">{it.label}</div>
                <div className="text-lg sm:text-xl font-semibold bk-fire-text">{it.value}</div>
                {it.sub && <div className="text-[11px] text-white/60">{it.sub}</div>}
                {it.label === "Accuracy" && (() => {
                  const toks = computeTopErrorTokens(errorEvents as any, errorFallback as any, 3);
                  if (!toks || toks.length === 0) return null;
                  return (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {toks.map((t) => (
                        <span key={t} className="px-2 py-0.5 text-xs rounded-full bg-white/6 border border-white/12" title={t === " " ? "space" : t}>
                          {t === " " ? "␣" : t}
                        </span>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}


