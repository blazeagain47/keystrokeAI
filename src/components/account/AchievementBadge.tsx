"use client";

import React from "react";
import { Achievement } from "@/lib/achievements";
import { Flame, Sparkles, Zap, Target, Trophy, CalendarDays } from "lucide-react";

function Icon({ name, className }: { name: string; className?: string }) {
  const props = { className } as any;
  if (name === "Flame") return <Flame {...props} />;
  if (name === "Sparkles") return <Sparkles {...props} />;
  if (name === "Zap") return <Zap {...props} />;
  if (name === "Target") return <Target {...props} />;
  if (name === "Trophy") return <Trophy {...props} />;
  if (name === "CalendarDays") return <CalendarDays {...props} />;
  return <Flame {...props} />;
}

export default function AchievementBadge({ ach }: { ach: Achievement }) {
  const unlocked = Boolean(ach.unlockedAt);
  const cls = unlocked
    ? "ring-1 ring-orange-500/50 bg-orange-500/10 hover:shadow-[0_0_24px_rgba(255,140,0,.25)]"
    : "border-white/10 bg-white/5 text-white/60";
  const pct = Math.round(((ach.progress ?? 0) * 100));
  return (
    <div className={`rounded-xl border ${cls} p-3 transition-shadow`} title={ach.desc}>
      <div className="flex items-center gap-2">
        <Icon name={ach.icon} className="w-4 h-4 text-orange-400" />
        <div className="text-sm font-medium text-white/90 truncate">{ach.title}</div>
      </div>
      {!unlocked && (
        <div className="mt-2">
          <div className="h-1.5 rounded bg-white/10 overflow-hidden">
            <div className="h-full bg-orange-500/70" style={{ width: `${pct}%` }} />
          </div>
          <div className="text-[11px] text-white/50 mt-1">{pct}%</div>
        </div>
      )}
    </div>
  );
}


