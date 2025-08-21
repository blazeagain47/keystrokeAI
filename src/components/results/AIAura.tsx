"use client";

import React from "react";

export function AIAura({ confidence = "High" as "High" | "Medium" | "Low" }) {
  const dotTone =
    confidence === "High" ? "bg-orange-400" :
    confidence === "Medium" ? "bg-amber-300" : "bg-yellow-200";
  return (
    <div className="flex items-center gap-2">
      <span className="relative inline-flex">
        <span className={`absolute inset-0 rounded-full blur-md ${dotTone}/40 animate-aiGlow`} />
        <span className={`relative block size-3 rounded-full ${dotTone}`} />
      </span>
      <h3 className="text-orange-200 font-semibold">AI Feedback</h3>
      <span className="ml-3 text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-orange-100/80">
        Confidence: {confidence}
      </span>
      <span className="ml-2 text-[11px] text-orange-200/60">Auto-generated coaching</span>
    </div>
  );
}


