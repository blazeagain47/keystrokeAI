"use client";

import React from "react";

export function ConfidenceMeter({ level = "High" as "High"|"Medium"|"Low" }) {
  const pct = level === "High" ? 1 : level === "Medium" ? 0.66 : 0.33;
  return (
    <div className="flex items-center gap-2 text-[11px] text-orange-200/70">
      <span>Confidence:</span>
      <div className="relative h-1.5 w-24 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-300 via-orange-400 to-amber-500"
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <span className="text-orange-100/80">{level}</span>
    </div>
  );
}


