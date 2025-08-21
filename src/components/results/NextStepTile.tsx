"use client";

import React from "react";

export function NextStepTile({ title, xp, onClick }: { title: string; xp: number; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="
        mt-3 inline-flex items-center justify-between w-full md:w-auto gap-3
        rounded-2xl px-4 py-2 bg-gradient-to-r from-orange-500/15 to-amber-400/10
        ring-1 ring-orange-400/25 hover:ring-orange-300/40 shadow-[0_8px_32px_-12px_rgba(255,125,35,.35)]
        transition
      ">
      <div className="text-orange-100 font-medium">{title}</div>
      <span className="text-[11px] px-2 py-0.5 rounded-full bg-black/20 text-orange-200/90">+{xp} XP</span>
    </button>
  );
}


