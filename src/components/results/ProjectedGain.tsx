"use client";

import React from "react";
import { TrendingUp } from "lucide-react";

export function ProjectedGain({ wpm }: { wpm: number }) {
  if (!Number.isFinite(wpm) || wpm <= 0) return null;
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs
                    bg-emerald-400/10 ring-1 ring-emerald-400/20 text-emerald-200">
      <TrendingUp className="size-3.5" />
      <span className="uppercase tracking-wider">Projected Gain</span>
      <strong className="font-semibold">+{Math.round(wpm)} WPM</strong>
    </div>
  );
}


