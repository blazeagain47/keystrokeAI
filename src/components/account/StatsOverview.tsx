"use client";

import React, { useMemo } from "react";
import { useStatsStore } from "@/stores/useStatsStore";
import { summarize } from "@/lib/historyLocal";
import { isTodayLocal } from "@/lib/historyNormalize";
import CountUpNumber from "./CountUpNumber";
import { Flame, Target, ListChecks, Sparkles } from "lucide-react";

/**
 * Calm-but-alive stats strip. No XP/streak — just the numbers that matter
 * for "how am I actually doing": average WPM/accuracy across every test,
 * total sessions, and a quick today snapshot. Numbers count up into view.
 */
export default function StatsOverview({ className = "" }: { className?: string }) {
  const history = useStatsStore((s) => s.history);

  // Always computed from the full history regardless of any range filter,
  // so "average WPM" genuinely means across all tests.
  const allTime = useMemo(() => summarize(history ?? []), [history]);

  const today = useMemo(() => {
    const runs = (history ?? []).filter((r) => isTodayLocal(Number((r as any).ts)));
    const n = runs.length;
    const sumW = runs.reduce((a, r) => a + Number((r as any).wpm ?? 0), 0);
    return { sessions: n, avgWpm: n ? Math.round(sumW / n) : 0 };
  }, [history]);

  const hasHistory = allTime.sessions > 0;

  const tiles: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    value: number | null;
    suffix?: string;
    helper?: string;
  }[] = [
    {
      label: "Avg WPM",
      icon: Flame,
      value: hasHistory ? allTime.avgWpm : null,
      helper: "across all tests",
    },
    {
      label: "Avg Accuracy",
      icon: Target,
      value: hasHistory ? allTime.avgAcc : null,
      suffix: "%",
      helper: "across all tests",
    },
    {
      label: "Total Sessions",
      icon: ListChecks,
      value: hasHistory ? allTime.sessions : 0,
    },
    {
      label: "Today",
      icon: Sparkles,
      value: today.sessions,
      helper: today.sessions ? `${today.avgWpm} WPM avg` : "No sessions yet",
    },
  ];

  return (
    <div className={`bk-fire-card bk-card-sheen relative ${className}`}>
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-white/10">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <div key={t.label} className="p-5 md:p-6">
              <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-white/45">
                <Icon className="h-3.5 w-3.5 text-orange-400/70" aria-hidden />
                {t.label}
              </div>
              <div className="mt-1.5 text-2xl md:text-3xl font-bold tabular-nums">
                {t.value === null ? (
                  <span className="text-white/40">—</span>
                ) : (
                  <CountUpNumber value={t.value} suffix={t.suffix} className="text-fire" />
                )}
              </div>
              {t.helper ? <div className="mt-1 text-xs text-white/40">{t.helper}</div> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
