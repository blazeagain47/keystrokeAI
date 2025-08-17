"use client";
import { useEffect, useRef } from "react";

type Props = {
  points: number[]; // values 0..100
  width?: number;
  height?: number;
  className?: string;
};

export default function FireSparkline({ points, width = 180, height = 48, className }: Props) {
  const pathRef = useRef<SVGPathElement>(null);

  const buildPath = () => {
    const w = width;
    const h = height;
    const step = w / Math.max(1, points.length - 1);
    const norm = (v: number) => h - (v / 100) * h;
    let d = `M 0 ${norm(points[0] ?? 0)}`;
    points.forEach((v, i) => {
      const x = i * step;
      d += ` L ${x} ${norm(v)}`;
    });
    return d;
  };

  useEffect(() => {
    const el = pathRef.current;
    if (!el) return;
    const len = el.getTotalLength();
    el.style.strokeDasharray = `${len}`;
    el.style.setProperty("--dash", `${len}`);
    el.classList.remove("animate-draw");
    // force reflow to restart animation
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    el.getBBox();
    el.classList.add("animate-draw");
  }, [points]);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className}>
      <defs>
        <linearGradient id="fireStroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"  stopColor="#FF6A00"/>
          <stop offset="50%" stopColor="#FF3D00"/>
          <stop offset="100%" stopColor="#FFD36E"/>
        </linearGradient>
      </defs>
      <path
        ref={pathRef}
        d={buildPath()}
        fill="none"
        stroke="url(#fireStroke)"
        strokeWidth="2.5"
        strokeLinecap="round"
        style={{ strokeDashoffset: "var(--dash)" }}
        className="animate-draw drop-shadow-[0_0_6px_rgba(255,61,0,0.5)]"
      />
    </svg>
  );
}


