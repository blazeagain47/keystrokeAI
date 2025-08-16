"use client";
import { motion, useReducedMotion } from "framer-motion";
import React from "react";

type SparklineProps = {
  points: Array<[number, number]>;
  width?: number;
  height?: number;
  duration?: number;         // default 3s
  toneFrom?: string;         // default "#ff4d4f"
  toneTo?: string;           // default "#ff9a1f"
  showEmber?: boolean;       // default true
  className?: string;
};

export default function Sparkline({
  points,
  width = 200,
  height = 60,
  duration = 3,
  toneFrom = "#ff4d4f",
  toneTo = "#ff9a1f",
  showEmber = true,
  className,
}: SparklineProps) {
  const prefersReducedMotion = useReducedMotion();
  const d = React.useMemo(() => {
    if (!points.length) return "";
    const [x0, y0] = points[0];
    const rest = points.slice(1).map(([x, y]) => `L ${x} ${y}`).join(" ");
    return `M ${x0} ${y0} ${rest}`;
  }, [points]);

  const id = React.useId(); // unique gradient id

  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
    >
      <defs>
        <linearGradient id={`glow-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={toneFrom} />
          <stop offset="100%" stopColor={toneTo} />
        </linearGradient>
        <filter id={`soft-${id}`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* track */}
      <path
        d={d}
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth={2}
      />

      {/* animated line */}
      <motion.path
        d={d}
        fill="none"
        stroke={`url(#glow-${id})`}
        strokeWidth={3}
        strokeLinecap="round"
        filter={`url(#soft-${id})`}
        initial={{ pathLength: prefersReducedMotion ? 1 : 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: prefersReducedMotion ? 0 : duration, ease: "easeInOut" }}
      />

      {/* traveling ember */}
      {showEmber && !prefersReducedMotion && (
        <motion.circle
          r={3.5}
          fill={toneTo}
          filter={`url(#soft-${id})`}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration, ease: "easeInOut" }}
        >
          <animateMotion
            dur={`${duration}s`}
            path={d}
            fill="freeze"
            keyPoints="0;1"
            keyTimes="0;1"
          />
        </motion.circle>
      )}
    </svg>
  );
}


