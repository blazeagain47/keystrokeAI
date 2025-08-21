"use client";

import React from "react";
import { Activity, Crosshair, Timer } from "lucide-react";

export function FocusTag({ focus }: { focus: "Rhythm"|"Precision"|"Endurance" }) {
  const Icon = focus === "Rhythm" ? Activity : focus === "Precision" ? Crosshair : Timer;
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs
                    bg-white/8 ring-1 ring-white/10 text-orange-100">
      <Icon className="size-3.5" />
      <span className="tracking-wide">{focus}</span>
    </div>
  );
}


