"use client";
import React from "react";

export default function SmartTestBadge({ usedDifficulty, difficultyChanged }: { usedDifficulty: string; difficultyChanged: boolean }) {
  const label = usedDifficulty ? usedDifficulty.charAt(0).toUpperCase() + usedDifficulty.slice(1) : "";
  return (
    <span
      className={
        `px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-500 to-orange-500 text-black shadow-sm transition-all duration-500 ease-out ` +
        (difficultyChanged ? "scale-110 animate-pulse" : "scale-100")
      }
    >
      AI Smart Test — {label}
    </span>
  );
}


