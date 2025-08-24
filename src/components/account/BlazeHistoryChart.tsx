"use client";
import React, { useEffect, useMemo, useRef } from "react";

type Pt = { t: string; wpm: number; acc: number };

export default function BlazeHistoryChart({ points }: { points: Pt[] }) {
  const pathRef = useRef<SVGPathElement>(null);

  const dims = { w: 600, h: 180, pad: 12 };
  const { dWpm, dAcc, circles, ticks, last } = useMemo(() => {
    const { w, h, pad } = dims;
    const xs = points.map((_, i) => i);
    const ysW = points.map((p) => p.wpm);
    const ysA = points.map((p) => p.acc);

    const maxW = Math.max(120, ...ysW, 1);
    const maxA = 100;

    const stepX = (w - pad * 2) / Math.max(1, points.length - 1);
    const x = (i: number) => pad + i * stepX;
    const yW = (v: number) => h - pad - (v / maxW) * (h - pad * 2);
    const yA = (v: number) => h - pad - (v / maxA) * (h - pad * 2);

    let dWpm = "";
    points.forEach((p, i) => (dWpm += i === 0 ? `M ${x(i)} ${yW(p.wpm)}` : ` L ${x(i)} ${yW(p.wpm)}`));

    let dAcc = "";
    points.forEach((p, i) => (dAcc += i === 0 ? `M ${x(i)} ${yA(p.acc)}` : ` L ${x(i)} ${yA(p.acc)}`));

    const circles = points.map((p, i) => ({
      cx: x(i),
      cy: yW(p.wpm),
      title: `${new Date(p.t).toLocaleDateString()} · ${p.wpm} WPM · ${p.acc}%`,
    }));

    const every = Math.max(1, Math.floor(points.length / 6));
    const ticks = points
      .map((p, i) => (i % every === 0 || i === points.length - 1 ? { x: x(i), label: new Date(p.t).toLocaleDateString() } : null))
      .filter(Boolean) as Array<{ x: number; label: string }>;

    const last = points[points.length - 1]
      ? { x: x(points.length - 1), y: yW(points[points.length - 1].wpm), wpm: points[points.length - 1].wpm }
      : null;

    return { dWpm, dAcc, circles, ticks, last };
  }, [points]);

  useEffect(() => {
    const el = pathRef.current;
    if (!el) return;
    const len = el.getTotalLength();
    el.style.strokeDasharray = String(len);
    el.style.strokeDashoffset = String(len);
    el.getBoundingClientRect();
    requestAnimationFrame(() => (el.style.strokeDashoffset = "0"));
  }, [dWpm]);

  return (
    <figure className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center gap-3 px-1 pb-1 text-sm">
        <span className="inline-flex items-center gap-2 text-white/80">
          <span className="inline-block h-2 w-4 rounded-sm" style={{ background: "linear-gradient(135deg,#FF3D00,#FF6A00 55%,#FFD36E)" }} />
          WPM
        </span>
        <span className="inline-flex items-center gap-2 text-white/60">
          <span className="inline-block h-0.5 w-4 rounded-sm bg-white/40" />
          Accuracy
        </span>
      </div>

      <svg viewBox={`0 0 ${dims.w} ${dims.h}`} className="w-full h-[180px]" aria-label="Performance over time">
        {Array.from({ length: 4 }).map((_, i) => (
          <line
            key={i}
            x1="0"
            x2={dims.w}
            y1={dims.pad + ((dims.h - dims.pad * 2) / 4) * i}
            y2={dims.pad + ((dims.h - dims.pad * 2) / 4) * i}
            stroke="rgba(255,255,255,0.06)"
          />
        ))}

        <path d={dAcc} fill="none" stroke="rgba(255,255,255,.45)" strokeDasharray="4 3" strokeWidth="1.5" />

        <path
          ref={pathRef}
          d={dWpm}
          fill="none"
          stroke="url(#bkChart)"
          strokeWidth="3"
          className="drop-shadow-[0_0_6px_rgba(255,106,0,.45)]"
          style={{ transition: "stroke-dashoffset .6s ease" }}
        />
        <defs>
          <linearGradient id="bkChart" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#FF3D00" /><stop offset="0.6" stopColor="#FF6A00" /><stop offset="1" stopColor="#FFD36E" />
          </linearGradient>
        </defs>

        {circles.map((c, i) => (
          <g key={i}>
            <circle cx={c.cx} cy={c.cy} r="3.5" fill="#FF6A00" />
            <title>{c.title}</title>
          </g>
        ))}

        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={t.x} x2={t.x} y1={dims.h - dims.pad} y2={dims.h - dims.pad + 4} stroke="rgba(255,255,255,0.3)" />
            <text x={t.x} y={dims.h - 1} textAnchor="middle" className="fill-white/60 text-[10px]">{t.label}</text>
          </g>
        ))}

        {last && (
          <>
            <circle cx={last.x} cy={last.y} r="5.5" fill="rgba(255,255,255,0.2)" />
            <rect x={Math.max(8, last.x - 36)} y={Math.max(8, last.y - 28)} width="72" height="20" rx="6" fill="rgba(0,0,0,0.5)" />
            <text x={last.x} y={Math.max(8, last.y - 14)} textAnchor="middle" className="fill-white text-[11px] font-semibold">
              {last.wpm} WPM
            </text>
          </>
        )}
      </svg>

      <figcaption className="mt-3 text-xs text-white/70 flex items-center gap-2 px-1">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-400" aria-hidden />
        <span>WPM by day for the selected range. Hover points for exact values (native tooltips).</span>
      </figcaption>
    </figure>
  );
}


