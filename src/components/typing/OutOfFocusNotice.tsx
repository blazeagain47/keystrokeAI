"use client";
import React from "react";
import usePageVisibility from "@/hooks/usePageVisibility";
import { useUIStore } from "@/stores/useUIStore";

export default function OutOfFocusNotice({ activeRun }: { activeRun: boolean }) {
  const { outOfFocus } = usePageVisibility();
  const isFocus = useUIStore(s => s.isFocus);

  const show = activeRun && isFocus && outOfFocus;
  if (!show) return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center"
    >
      <div className="backdrop-blur-sm bg-black/30 w-full h-full absolute inset-0" />
      <div className="relative rounded-2xl px-5 py-3 text-sm font-medium text-white/90 bg-black/50 border border-white/10 shadow-xl">
        <span className="opacity-90">Out of focus — return to the window to continue</span>
      </div>
    </div>
  );
}


