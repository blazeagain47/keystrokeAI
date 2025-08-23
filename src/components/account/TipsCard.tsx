"use client";

import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { useStatsStore } from "@/stores/useStatsStore";
import { isTodayLocal } from "@/lib/historyNormalize";

export default function TipsCard({ className = "" }: { className?: string }) {
  const history = useStatsStore((s) => s.history);
  const streak = useStatsStore((s) => s.streakDays);

  const today = useMemo(() => {
    const runs = Array.isArray(history) ? history.filter((r: any) => isTodayLocal(Number((r as any).ts))) : [];
    const n = runs.length;
    const sumW = runs.reduce((a: number, r: any) => a + Number((r as any).wpm ?? 0), 0);
    const sumA = runs.reduce((a: number, r: any) => a + Number((r as any).acc ?? 0), 0);
    return { sessions: n, avgWpm: n ? Math.round(sumW / n) : 0, avgAcc: n ? Math.round(sumA / n) : 0 };
  }, [history]);

  return (
    <Card className={`rounded-2xl border border-white/10 bg-gray-900/40 backdrop-blur-md hover:shadow-[0_0_30px_rgba(255,110,0,.15)] transition-shadow ${className}`}>
      <CardContent className="p-4 md:p-5">
        <div className="flex items-center gap-2 text-base font-semibold text-white mb-2">
          <Activity className="h-4 w-4 text-orange-400" aria-hidden />
          <span>Today at a glance</span>
        </div>
        {today.sessions > 0 ? (
          <>
            <div className="text-white text-lg font-semibold tracking-tight">
              {today.sessions} session{today.sessions === 1 ? "" : "s"}
            </div>
            <div className="text-white/70 text-sm">{today.avgWpm} WPM · {today.avgAcc}% acc</div>
            <div className="text-white/60 text-xs mt-2">Streak: {streak} day{streak === 1 ? "" : "s"} — keep it going 🔥</div>
          </>
        ) : (
          <>
            <div className="text-white/80">No sessions yet today</div>
            <div className="text-white/60 text-sm">Start a quick test to log your first session.</div>
          </>
        )}
      </CardContent>
    </Card>
  );
}


