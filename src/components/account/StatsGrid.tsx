import { isAbort } from "@/lib/isAbort";
"use client";
import * as React from "react";
import AnimatedXPCard from "./AnimatedXPCard";
import { useAuth } from "@/hooks/useAuth";

type Props = {
  totalXP: number;
  streak: number;
  memberSince: string;
};

export default function StatsGrid({ totalXP, streak, memberSince }: Props) {
  const { user } = useAuth();
  const [xp, setXp] = React.useState<number>(user?.xpTotal ?? totalXP ?? 0);

  React.useEffect(() => {
    const have = Number(user?.xpTotal ?? 0);
    if (have > 0) { setXp(have); return; }
    const ac = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/stats/summary?range=all", { cache: "no-store", signal: ac.signal });
        const data = await res.json().catch(() => ({}));
        const fxp = Number(data?.totalXP ?? data?.total_xp ?? data?.xp ?? 0);
        setXp(isFinite(fxp) ? fxp : 0);
      } catch (e) {
        if (!isAbort(e)) console.warn("[summary] fetch failed:", e);
      }
    })();
    return () => ac.abort();
  }, [user?.xpTotal]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <AnimatedXPCard xpTotal={xp} xpMax={10000} />

      <div className="rounded-2xl p-4 border border-white/10 bg-gradient-to-br from-white/5 to-transparent">
        <div className="text-sm text-white/60">Current Streak</div>
        <div className="text-3xl font-semibold tracking-tight">{streak}</div>
        <div className="text-xs text-white/50 mt-1">Keep up the daily practice!</div>
      </div>

      <div className="rounded-2xl p-4 border border-white/10 bg-gradient-to-br from-white/5 to-transparent">
        <div className="text-sm text-white/60">Member Since</div>
        <div className="text-xl font-medium">{memberSince}</div>
        <div className="text-xs text-white/50 mt-1">Thanks for being here ✨</div>
      </div>
    </div>
  );
}


