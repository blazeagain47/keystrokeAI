"use client";

import React from "react";

export function AIAura({ confidence = "High" as "High" | "Medium" | "Low" }) {
  const dotTone =
    confidence === "High" ? "bg-orange-400" :
    confidence === "Medium" ? "bg-amber-300" : "bg-yellow-200";
  return (
    <span className="relative inline-flex" aria-hidden>
      <span className={`absolute inset-0 rounded-full blur-md ${dotTone}/40 animate-aiGlow`} />
      <span className={`relative block size-3 rounded-full ${dotTone}`} />
    </span>
  );
}


