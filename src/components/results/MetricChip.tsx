"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

export function MetricChip({
  icon: Icon,
  label,
  value,
  tone = "neutral" as "neutral"|"good"|"warn",
  suffix = "",
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tone?: "neutral" | "good" | "warn";
  suffix?: string;
}) {
  const toneCls =
    tone === "good" ? "text-emerald-300 bg-emerald-400/10 ring-emerald-400/20" :
    tone === "warn" ? "text-rose-300 bg-rose-400/10 ring-rose-400/20" :
                      "text-orange-200 bg-white/5 ring-white/10";
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ring-1 ${toneCls}`}>
      <Icon className="size-3.5" />
      <span className="uppercase tracking-wider text-[10px]">{label}</span>
      <strong className="font-semibold">{value}{suffix}</strong>
    </div>
  );
}


