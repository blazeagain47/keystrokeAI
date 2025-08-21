"use client";

import React from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

export function MicroSparkline({ data, className = "text-orange-300" }: { data: number[]; className?: string }) {
  const points = data.map((v, i) => ({ i, v }));
  return (
    <div className={`h-8 w-36 rounded-md bg-black/10 ring-1 ring-white/5 overflow-hidden relative ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] animate-shine" />
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 6, right: 6, bottom: 6, left: 6 }}>
          <Line type="monotone" dataKey="v" stroke="currentColor" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}


