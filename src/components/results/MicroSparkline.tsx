"use client";

import React from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function MicroSparkline({ data, flat = true, className = "text-orange-300" }: { data: number[]; flat?: boolean; className?: string }) {
  const points = data.map((v, i) => ({ i, v }));
  return (
    <TooltipProvider delayDuration={200}>
      <UiTooltip>
        <TooltipTrigger asChild>
          <div className={`${flat ? "h-8 w-40" : "h-8 w-36 rounded-md bg-black/10 ring-1 ring-white/5 overflow-hidden"} relative ${className}`} aria-label="Rhythm sparkline">
            {flat ? null : <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] animate-shine" />}
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 6, right: 6, bottom: 6, left: 6 }}>
                <Line type="monotone" dataKey="v" stroke="currentColor" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-[260px]">
          <p className="text-xs">Variance in inter-key intervals. Higher = steadier rhythm. Scale: 0–100.</p>
        </TooltipContent>
      </UiTooltip>
    </TooltipProvider>
  );
}


