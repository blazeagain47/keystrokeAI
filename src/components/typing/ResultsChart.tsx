"use client";

import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  ChartOptions,
  ChartData,
  Plugin,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

type Point = { second: number; wpm: number };

type Props = {
  chartData: Point[];          // [{ second, wpm }]
  avg?: number | null;         // optional avg reference line
  finishSec?: number | null;   // optional finish vertical line
  reducedMotion?: boolean;
  onFirstPaint?: () => void;
  className?: string;
};

function useCanvasSize(ref: React.RefObject<HTMLDivElement>) {
  const [size, setSize] = React.useState({ w: 0, h: 0 });
  React.useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const cr = entry.contentRect;
      setSize({ w: Math.round(cr.width), h: Math.round(cr.height) });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return size;
}

/**
 * Line reveal plugin: clips the chart area from left -> right based on `progress`.
 * This creates a true "draw on" effect instead of simply fading points in.
 */
const lineRevealPlugin: Plugin<"line"> = {
  id: "bk-line-reveal",
  beforeDatasetsDraw(chart, _args, opts) {
    const { ctx, chartArea } = chart;
    // @ts-ignore - our custom opts
    const progress: number = opts?.progress ?? 1;
    if (progress >= 1) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(chartArea.left, chartArea.top, chartArea.width * Math.max(0, progress), chartArea.height);
    ctx.clip();
  },
  afterDatasetsDraw(chart, _args, _opts) {
    chart.ctx.restore();
  },
};

ChartJS.register(lineRevealPlugin);

export default function ResultsChart({
  chartData,
  avg = null,
  finishSec = null,
  reducedMotion = false,
  onFirstPaint,
  className,
}: Props) {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const emberRef = React.useRef<HTMLDivElement>(null);
  const { w, h } = useCanvasSize(hostRef);

  // Gradient helpers using scriptable context; guard if chartArea isn't ready yet
  const gradientStroke = React.useCallback((c: any) => {
    const chart = c?.chart;
    const area = chart?.chartArea as ChartArea | undefined;
    if (!chart || !area) return "rgba(255,120,20,1)";
    const g = chart.ctx.createLinearGradient(area.left, 0, area.right, 0);
    g.addColorStop(0.0, "rgba(255, 90, 0, 1)");
    g.addColorStop(0.5, "rgba(255, 145, 0, 1)");
    g.addColorStop(1.0, "rgba(255, 200, 110, 1)");
    return g;
  }, []);
  const gradientFill = React.useCallback((c: any) => {
    const chart = c?.chart;
    const area = chart?.chartArea as ChartArea | undefined;
    if (!chart || !area) return "rgba(255,120,20,0.08)";
    const g = chart.ctx.createLinearGradient(0, area.bottom, 0, area.top);
    g.addColorStop(0, "rgba(255, 120, 20, 0.00)");
    g.addColorStop(1, "rgba(255, 120, 20, 0.10)");
    return g;
  }, []);

  // Reveal animation progress
  const [progress, setProgress] = React.useState(0);
  React.useEffect(() => {
    if (reducedMotion) {
      setProgress(1);
      onFirstPaint?.();
      return;
    }
    let raf = 0;
    const dur = 1000; // ms
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick);
      else onFirstPaint?.();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion, onFirstPaint]);

  // Subtle ember particles (pure CSS) — randomize on mount
  React.useEffect(() => {
    const root = emberRef.current;
    if (!root || reducedMotion) return;
    const N = Math.min(24, Math.max(8, Math.floor((w * h) / 30000))); // scale with area
    const frags: HTMLSpanElement[] = [];
    for (let i = 0; i < N; i++) {
      const s = document.createElement("span");
      s.className = "bk-ember";
      // random CSS vars used by animation
      s.style.setProperty("--x", Math.random().toString());
      s.style.setProperty("--d", (2 + Math.random() * 4).toFixed(2));  // duration (s)
      s.style.setProperty("--dl", (Math.random() * 2).toFixed(2));     // delay (s)
      s.style.setProperty("--sx", (Math.random() * 100).toFixed(2));   // start x (%)
      s.style.setProperty("--sz", (0.5 + Math.random() * 1.5).toFixed(2)); // size scale
      root.appendChild(s);
      frags.push(s);
    }
    return () => frags.forEach((n) => n.remove());
  }, [w, h, reducedMotion]);

  const labels = chartData.map(d => d.second);
  const values = chartData.map(d => d.wpm);

  const data: ChartData<"line"> = {
    labels,
    datasets: [
      {
        label: "WPM",
        data: values,
        borderColor: (ctx) => gradientStroke(ctx),
        backgroundColor: (ctx) => gradientFill(ctx),
        fill: true,
        borderWidth: 3,
        pointRadius: 0,
        tension: 0.35,
        // nice micro glow on hover
        pointHoverRadius: 5,
        pointHoverBackgroundColor: "#FFD36E",
        pointHoverBorderColor: "#FF6A00",
        pointHoverBorderWidth: 2,
      },
    ],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { left: 8, right: 12, top: 8, bottom: 28 } },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(10,10,10,.9)",
        borderColor: "rgba(255,120,20,.35)",
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        padding: 10,
        callbacks: {
          title: (ctx) => `Time: ${ctx[0].label}s`,
          label: (ctx) => `${Math.round(Number(ctx.raw))} WPM`,
        },
      },
      // reveal progress fed to plugin
      "bk-line-reveal": { progress },
    } as any,
    scales: {
      x: {
        grid: { color: "rgba(255,255,255,.14)", lineWidth: 1, drawBorder: false },
        ticks: { color: "rgba(255,255,255,.7)", padding: 6 },
      },
      y: {
        beginAtZero: true,
        grid: { color: "rgba(255,255,255,.14)", lineWidth: 1, drawBorder: false },
        ticks: { color: "rgba(255,255,255,.7)", padding: 6 },
      },
    },
    animation: reducedMotion
      ? false
      : {
          duration: 600,
          easing: "easeOutQuart",
        },
  };

  return (
    <div ref={hostRef} className={`relative size-full ${className ?? ""}`}>
      {/* ember / sparkles layer */}
      <div ref={emberRef} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden bk-embers-layer" />
      {/* subtle breathing halo over the whole chart area */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bk-chart-halo" />
      {/* the chart itself */}
      {w > 0 && h > 0 ? (
        <Line data={data} options={options} width={w} height={h} />
      ) : (
        <div className="absolute inset-0 animate-pulse bg-white/5 rounded-lg" />
      )}

      {/* reference lines overlays (avg + finish) */}
      {typeof avg === "number" && (
        <div
          aria-hidden
          className="absolute left-14 right-4 border-t border-dashed border-white/40"
          style={{
            top: "20%", // visually close to the chart's upper area; Chart.js overlay mapping is heavier. Keep it simple + consistent.
          }}
        />
      )}
      {typeof finishSec === "number" && (
        <div
          aria-hidden
          className="absolute top-2 bottom-8 border-l border-dashed border-white/30"
          style={{ left: "70%" }}
        />
      )}
    </div>
  );
}