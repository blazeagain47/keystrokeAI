"use client";

import * as React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function WeaknessChip({ k, score0to100, kind }: { k: string; score0to100: number; kind: "letter" | "digraph" }) {
  const score = Math.max(0, Math.min(100, Math.round(score0to100 || 0)));
  const tone = score >= 70 ? "rose" : score >= 40 ? "amber" : "zinc";
  const toneClasses =
    tone === "rose"
      ? "bg-rose-500/10 ring-rose-500/20 text-rose-200"
      : tone === "amber"
      ? "bg-amber-500/10 ring-amber-500/20 text-amber-200"
      : "bg-white/5 ring-white/10 text-white/80";

  const base = [
    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs tabular-nums",
    "ring-1 transition-[colors,transform] duration-200 ease-out",
    "hover:-translate-y-px hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
    toneClasses,
  ].join(" ");

  const title = kind === "letter" ? "Letter" : "Digraph";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={base} aria-label={`${kind} ${k}, score ${score}`}>
          <strong className="font-semibold">{k}</strong>
          <span className="text-white/70">·</span>
          <span>{score}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <div className="font-medium mb-0.5">{title}</div>
        <div>Score 0–100. Higher = needs more practice.</div>
      </TooltipContent>
    </Tooltip>
  );
}

export default WeaknessChip;


