"use client";
import React from "react";

function useCountUp(target: number, durationMs = 600) {
  const [value, setValue] = React.useState(0);
  React.useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / durationMs);
      setValue(Math.round(target * (0.5 - Math.cos(Math.PI * p) / 2))); // easeInOut
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return value;
}

export default function StatsGrid({
  xpTotal = 0,
  streak = 0,
  memberSince,
}: {
  xpTotal?: number;
  streak?: number;
  memberSince?: string;
}) {
  const xp = useCountUp(xpTotal);
  const st = useCountUp(streak);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -right-24 h-52 w-52 rounded-full bg-cyan-400/10 blur-2xl" />
        <div className="text-white/60 text-sm">Total XP</div>
        <div className="text-white text-3xl font-semibold mt-1 tabular-nums">{xp}</div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 relative overflow-hidden">
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-52 w-52 rounded-full bg-indigo-400/10 blur-2xl" />
        <div className="text-white/60 text-sm">Current Streak</div>
        <div className="text-white text-3xl font-semibold mt-1 tabular-nums">{st}</div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="text-white/60 text-sm">Member Since</div>
        <div className="text-white text-2xl font-semibold mt-1">
          {memberSince ? new Date(memberSince).toLocaleDateString() : "-"}
        </div>
      </div>
    </div>
  );
}


