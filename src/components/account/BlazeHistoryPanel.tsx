"use client";

import React, { useEffect, useMemo } from "react";
import { useStatsStore } from "@/stores/useStatsStore";
import { useAuthStore } from "@/store/auth";
import RangeTabs from "./RangeTabs";
import BlazeHistoryChart from "./BlazeHistoryChart";
import { toDailySeries } from "@/lib/historyLocal";
import { useTotalsStore } from "@/stores/useTotalsStore";
import { useOnVisible } from "@/lib/useOnVisible";
import AdSlot from "@/components/ads/AdSlot";

export default function BlazeHistoryPanel() {
  const ready = useStatsStore(s => s.ready);
  const hydrate = useStatsStore(s => s.hydrate);
  const { sessions, avgWpm, avgAcc, totalXP } = useStatsStore(s => s.summary);
  const history = useStatsStore(s => s.history);
  const range = useStatsStore(s => s.range);
  const userId = useAuthStore(s => s.user?.id);
  const streakFromTotals = useTotalsStore(s => s.streakDays) || 0;
  const hydrateTotals = useTotalsStore(s => s.hydrate);
  React.useEffect(() => { void hydrateTotals(); }, [hydrateTotals]);

  useEffect(() => {
    if (!userId || ready) return;
    const ac = new AbortController();
    (async () => { try { await hydrate(String(userId)); } catch {} })();
    return () => ac.abort();
  }, [ready, userId, hydrate]);

  const series = useMemo(() => {
    const daysBack = range === "all" ? 21 : range === "7d" ? 7 : 3;
    return toDailySeries(history ?? [], daysBack).map(p => ({ t: p.t, wpm: p.wpm, acc: p.acc }));
  }, [history, range]);

  const { ref, visible } = useOnVisible<HTMLDivElement>({ rootMargin: '250px' });
  return (
    <section className="space-y-4 mt-6 cv-auto cv-480">
      <div className="flex items-center justify-between">
        <h3 className="text-white/90 font-semibold">Blaze history</h3>
        <RangeTabs />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Tile label="Total XP" value={totalXP} />
        <Tile label="Current Streak" value={streakFromTotals} suffix="days" />
        <Tile label="Range average" value={sessions ? `${avgWpm} WPM · ${avgAcc}% acc` : "— WPM · —% acc"} helper={`${sessions} session${sessions===1? "": "s"}`} />
      </div>

      {/* Ad: Stats/History mid-content */}
      <AdSlot
        slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_STATS}
        pageKey="stats"
      />

      {series.length >= 1 ? (
        <div ref={ref} className="cv-auto cv-480">
          {visible ? (
            <BlazeHistoryChart points={series} />
          ) : (
            <div className="h-[300px] animate-pulse bg-white/5 rounded-xl border border-white/10" />
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white/70">
          Not enough data yet — complete a few sessions to see your trend.
        </div>
      )}
    </section>
  );
}

function Tile({
  label,
  value,
  suffix,
  helper,
}: {
  label: string;
  value: any;
  suffix?: string;
  helper?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <div className="text-white/70 text-sm">{label}</div>
      <div className="text-3xl font-semibold text-white mt-1">
        {value}
        {suffix ? (
          <span className="text-white/60 ml-1 text-base">{suffix}</span>
        ) : null}
      </div>
      {helper ? <div className="text-white/50 text-xs mt-1">{helper}</div> : null}
    </div>
  );
}


