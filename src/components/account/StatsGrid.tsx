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
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <AnimatedXPCard xpTotal={user?.xpTotal ?? totalXP} xpToNext={1000} />

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


