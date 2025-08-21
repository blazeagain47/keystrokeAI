"use client";

import React from "react";

export function CoachPraise({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="mt-3 text-sm text-orange-100/90 bg-white/5 ring-1 ring-white/10 rounded-2xl px-3 py-2">
      {text}
    </div>
  );
}


