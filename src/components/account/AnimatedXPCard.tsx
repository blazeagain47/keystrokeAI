"use client";
import { motion, useReducedMotion } from "framer-motion";
import CountUp from "@/components/ui/CountUp";
import Sparkline from "@/components/ui/Sparkline";
import React from "react";

type Props = {
  xpTotal: number;
  xpToNext: number; // how much needed for next level
};

export default function AnimatedXPCard({ xpTotal, xpToNext }: Props) {
  const prefersReducedMotion = useReducedMotion();
  const percent = React.useMemo(() => {
    if (xpToNext <= 0) return 1;
    const p = Math.min(1, Math.max(0, xpTotal / xpToNext));
    return p;
  }, [xpTotal, xpToNext]);

  // simple demo sparkline shape; in real app feed last 14 days
  const points = React.useMemo(() => {
    const W = 200, H = 60;
    const base = [ [0, H*0.7], [W*0.2, H*0.5], [W*0.35, H*0.6], [W*0.55, H*0.35], [W*0.75, H*0.55], [W, H*0.4] ] as Array<[number, number]>;
    return base;
  }, []);

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-4">
      <div className="flex items-center gap-4">
        {/* Radial progress */}
        <div className="relative h-14 w-14">
          <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
            <path
              d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32"
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="3"
            />
            <motion.path
              d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32"
              fill="none"
              stroke="url(#xpGrad)"
              strokeWidth="3.5"
              strokeLinecap="round"
              initial={{ pathLength: prefersReducedMotion ? percent : 0 }}
              animate={{ pathLength: percent }}
              transition={{ duration: prefersReducedMotion ? 0 : 1.2, ease: "easeOut" }}
            />
            <defs>
              <linearGradient id="xpGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ff4d4f" />
                <stop offset="100%" stopColor="#ff9a1f" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 grid place-items-center text-xs text-white/80">
            {Math.round(percent * 100)}%
          </div>
        </div>

        <div className="flex-1">
          <div className="text-xs text-white/60">Total XP</div>
          <div className="text-2xl font-semibold tracking-tight">
            <CountUp value={xpTotal} />
          </div>
          <div className="text-[11px] text-white/50">Progress to next level</div>
        </div>
      </div>

      <div className="mt-3">
        <Sparkline
          points={points}
          width={260}
          height={64}
          duration={3}
          toneFrom="#ff4d4f"
          toneTo="#ff9a1f"
          showEmber
        />
      </div>
    </div>
  );
}


