"use client";
import React, { useEffect } from "react";
import { useStatsStore } from "@/stores/useStatsStore";
import { useAuthStore } from "@/store/auth";
import RangeTabs from "./RangeTabs";

export default function BlazeHistoryPanel() {
  const ready = useStatsStore(s => s.ready);
  const hydrate = useStatsStore(s => s.hydrate);
  const { sessions, avgWpm, avgAcc, totalXP } = useStatsStore(s => s.summary);
  const userId = useAuthStore(s => s.user?.id);

  useEffect(() => {
    if (!ready && userId) {
      void hydrate(String(userId));
    }
  }, [ready, userId, hydrate]);

  return (
    <section className="space-y-4 mt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-white/90 font-semibold">Blaze history</h3>
        <RangeTabs />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Tile label="Total XP" value={totalXP} />
        <Tile label="Current Streak" value={0} suffix="days" />
        <Tile label="Range average" value={sessions ? `${avgWpm} WPM · ${avgAcc}% acc` : "— WPM · —% acc"} helper={`${sessions} session${sessions===1? "": "s"}`} />
      </div>

      {/* Chart / sparkline: render an empty state if <2 points */}
      {/* existing chart usage here */}
    </section>
  );
}

function Tile({ label, value, suffix, helper }:{ label:string; value: any; suffix?:string; helper?:string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <div className="text-white/70 text-sm">{label}</div>
      <div className="text-3xl font-semibold text-white mt-1">{value}{suffix ? <span className="text-white/60 ml-1 text-base">{suffix}</span> : null}</div>
      {helper ? <div className="text-white/50 text-xs mt-1">{helper}</div> : null}
    </div>
  );
}


