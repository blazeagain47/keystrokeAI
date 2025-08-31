"use client";
import React from "react";
export default function LatencyHUD() {
  if (process.env.NEXT_PUBLIC_DEV_PROBE !== "1") return null;
  return (
    <div style={{ position:"fixed", right:8, bottom:8, zIndex:50 }}
         className="text-[10px] px-2 py-1 bg-black/60 border border-white/10 rounded">
      Latency probe active (check console)
    </div>
  );
}


