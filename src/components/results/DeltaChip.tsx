"use client";

import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export function DeltaChip({ label, delta, suffix = "" }: { label: string; delta: number; suffix?: string }) {
  const isUp = delta > 0, isDown = delta < 0;
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  const tone = isUp ? "text-emerald-300 bg-emerald-400/10 ring-emerald-400/20"
             : isDown ? "text-rose-300 bg-rose-400/10 ring-rose-400/20"
             : "text-orange-200 bg-white/5 ring-white/10";
  return (
    <div className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ring-1 ${tone}`}>
      <Icon className="size-3" />
      <span className="uppercase tracking-wider text-[10px]">{label}</span>
      <strong className="font-semibold">{isDown ? "" : (delta === 0 ? "" : "+")}{delta}{suffix}</strong>
    </div>
  );
}


