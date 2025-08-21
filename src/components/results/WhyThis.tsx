"use client";

import React from "react";

export function WhyThis({ text }: { text: string }) {
  if (!text) return null;
  return (
    <details className="mt-2 group">
      <summary className="text-xs text-orange-200/70 hover:text-orange-200 cursor-pointer">Why this?</summary>
      <div className="mt-1 text-xs text-orange-100/80 bg-black/10 ring-1 ring-white/5 rounded-lg p-2">
        {text}
      </div>
    </details>
  );
}


