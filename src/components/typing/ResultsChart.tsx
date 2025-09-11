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

// ---- Centered autoscale helpers ----
function computeCenteredYRange(values: number[], opts?: { pad?: number; minSpan?: number; floor?: number }) {
  const pad = opts?.pad ?? 0.25;
  const minSpan = opts?.minSpan ?? 30;
  const floor = opts?.floor ?? 0;
  if (!values?.length) return { min: 0, max: minSpan };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const vmin = Math.min(...values), vmax = Math.max(...values);
  const dev = Math.max(mean - vmin, vmax - mean, minSpan / 2);
  let yMin = Math.max(floor, mean - dev * (1 + pad));
  let yMax = mean + dev * (1 + pad);
  if (yMax - yMin < minSpan) {
    const extra = (minSpan - (yMax - yMin)) / 2;
    yMin = Math.max(floor, yMin - extra);
    yMax = yMax + extra;
  }
  return { min: yMin, max: yMax };
}
function niceStep(min: number, max: number, approxTicks = 6) {
  const span = Math.max(1, max - min);
  const rough = span / approxTicks;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const choices = [1, 2, 2.5, 5, 10];
  const step = (choices.find((c) => c * pow >= rough) ?? 10) * pow;
  return step;
}

// ---- Stroke gradient plugin (subtle) ----
const bkGradientStroke: Plugin<"line"> = {
  id: "bk-gradient-stroke",
  beforeDatasetsDraw(chart) {
    const { ctx, chartArea } = chart as any;
    if (!chartArea) return;
    const grad = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
    grad.addColorStop(0, "#FFA856");
    grad.addColorStop(1, "#FF6E40");
    // apply to datasets that opt in
    // @ts-ignore: using private opt-in flag
    chart.config.data.datasets.forEach((ds: any) => {
      if (ds._useBkGradient) ds.borderColor = grad;
    });
  },
};

ChartJS.register(bkGradientStroke);
type Point = { second: number; wpm: number };

type Props = {
  chartData: Point[];          // [{ second, wpm }]
  avg?: number | null;         // optional avg reference line
  finishSec?: number | null;   // optional finish vertical line
  reducedMotion?: boolean;
  visible?: boolean;           // scroll-in trigger
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

// --- Plugins: local-only, passed via <Line plugins={[...]} /> ---

// 1) Reveal animation: progressively clips the drawing area from left->right.
const bkLineReveal: Plugin<"line"> = {
  id: "bk-line-reveal",
  beforeDatasetsDraw(chart, _args, opts) {
    const progress = (opts as any)?.progress ?? 1; // 0..1
    const { ctx, chartArea } = chart;
    if (!chartArea || progress >= 1) return;
    ctx.save();
    const w = chartArea.right - chartArea.left;
    const h = chartArea.bottom - chartArea.top;
    ctx.beginPath();
    ctx.rect(chartArea.left, chartArea.top, w * Math.max(0, Math.min(1, progress)), h);
    ctx.clip();
  },
  afterDatasetsDraw(chart, _args, opts) {
    const progress = (opts as any)?.progress ?? 1;
    if (progress < 1) chart.ctx.restore();
  },
};

// 2) Optional accurate data-space guides (disabled by default).
//    We keep this for future: avg WPM (horizontal) and finishSec (vertical).
export const bkGuides: Plugin<"line"> = {
  id: "bk-guides",
  afterDraw(chart, _args, opts) {
    const { ctx, scales } = chart;
    const show = (opts as any)?.showGuides ?? false;
    if (!show) return;
    const avg = (opts as any)?.avg;
    const finishSec = (opts as any)?.finishSec;

    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;

    // Horizontal @ avg WPM
    if (typeof avg === "number" && isFinite(avg)) {
      const y = (scales as any).y.getPixelForValue(avg);
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.moveTo((scales as any).x.left, y);
      ctx.lineTo((scales as any).x.right, y);
      ctx.stroke();
    }

    // Vertical @ finish second
    if (typeof finishSec === "number" && isFinite(finishSec)) {
      const x = (scales as any).x.getPixelForValue(finishSec);
      ctx.strokeStyle = "rgba(255,255,255,0.30)";
      ctx.beginPath();
      ctx.moveTo(x, (scales as any).y.top);
      ctx.lineTo(x, (scales as any).y.bottom);
      ctx.stroke();
    }
    ctx.restore();
  },
};

// 3) Fire-themed glow around the plot area frame (inside chart padding)
const bkFrameGlow: Plugin<"line"> = {
  id: "bk-frame-glow",
  afterDraw(chart, _args, opts) {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;
    const { left, right, top, bottom } = chartArea;

    // configurable via options.plugins["bk-frame-glow"]
    const lineWidth = (opts as any)?.lineWidth ?? 2;
    const shadowBlur = (opts as any)?.shadowBlur ?? 14;
    const colorCore = (opts as any)?.colorCore ?? "rgba(255,140,30,0.9)";   // bright ember
    const colorHalo = (opts as any)?.colorHalo ?? "rgba(255,110,20,0.35)";   // soft outer halo
    const radius = (opts as any)?.radius ?? 8;

    // helper to draw a rounded rect around chartArea
    const roundedRect = (r: number) => {
      const x = left + 0.5, y = top + 0.5, w = right - left - 1, h = bottom - top - 1;
      const rr = Math.min(r, w / 10, h / 10);
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.lineTo(x + w - rr, y);
      ctx.arcTo(x + w, y, x + w, y + rr, rr);
      ctx.lineTo(x + w, y + h - rr);
      ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
      ctx.lineTo(x + rr, y + h);
      ctx.arcTo(x, y + h, x, y + h - rr, rr);
      ctx.lineTo(x, y + rr);
      ctx.arcTo(x, y, x + rr, y, rr);
    };

    ctx.save();

    // Outer halo (lighter mode for additive glow)
    ctx.globalCompositeOperation = "lighter";
    ctx.lineWidth = lineWidth;
    ctx.shadowBlur = shadowBlur;
    ctx.shadowColor = colorHalo;
    ctx.strokeStyle = colorHalo;
    roundedRect(radius);
    ctx.stroke();

    // Core ember stroke on top (sharper)
    ctx.shadowBlur = Math.max(6, shadowBlur * 0.55);
    ctx.shadowColor = colorCore;
    ctx.strokeStyle = colorCore;
    roundedRect(radius);
    ctx.stroke();

    ctx.restore();
  },
};

export default function ResultsChart({
  chartData,
  avg = null,
  finishSec = null,
  reducedMotion = false,
  visible = true,
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

  // Reveal animation progress (0..1), starts when visible
  const [reveal, setReveal] = React.useState(0);
  React.useEffect(() => {
    if (reducedMotion) { setReveal(1); return; }
    if (!visible) return;
    let raf = 0;
    const start = performance.now();
    const dur = 900; // ms
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setReveal(p);
      if (p < 1) raf = requestAnimationFrame(tick); else onFirstPaint?.();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible, reducedMotion, onFirstPaint]);

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

  // Compute centered Y range so the line sits mid-chart
  const yCentered = computeCenteredYRange(values, { pad: 0.25, minSpan: 30, floor: 0 });

  const data: ChartData<"line"> = {
    labels,
    datasets: [
      {
        label: "WPM",
        data: values,
        // gradient applied by plugin when _useBkGradient = true
        borderColor: "#FF9C5A",
        backgroundColor: (ctx) => gradientFill(ctx),
        fill: true,
        borderWidth: 3,
        pointRadius: (ctx) => (ctx.dataIndex === values.length - 1 ? 3.5 : 0),
        tension: 0.35,
        // nice micro glow on hover
        pointHoverRadius: 5,
        pointHoverBackgroundColor: "#FFD36E",
        pointHoverBorderColor: "#FF6A00",
        pointHoverBorderWidth: 2,
        // @ts-ignore opt-in for gradient stroke plugin
        _useBkGradient: true,
      },
    ],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { left: 8, right: 12, top: 8, bottom: 20 } },
    interaction: { mode: "nearest", intersect: false, axis: "x" },
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
          title: (ctx) => `Time (seconds): ${ctx[0].label}`,
          label: (ctx) => `Words per minute: ${Math.round(Number(ctx.raw))}`,
        },
      },
    } as any,
    elements: {
      point: {
        radius: 0,
        hitRadius: 16,
        hoverRadius: 5,
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(255,255,255,.14)", lineWidth: 1, drawBorder: false },
        ticks: { color: "rgba(255,255,255,.7)", padding: 6 },
        title: {
          display: ({ chart }) => chart.width > 420,
          text: "Time (s)",
          color: "rgba(255,180,100,.9)",
          // ~1.2× bigger; clamps 14–18px based on canvas height
          font: (ctx: any) => ({
            weight: 700,
            size: Math.max(14, Math.min(18, Math.round(ctx.chart.height / 18))),
          }),
          padding: { top: 10 },
        } as any,
      },
      y: {
        min: yCentered.min,
        max: yCentered.max,
        grid: { color: "rgba(255,255,255,.14)", lineWidth: 1, drawBorder: false },
        ticks: {
          color: "rgba(255,255,255,.7)",
          padding: 6,
          stepSize: niceStep(yCentered.min, yCentered.max, 6),
        },
        title: {
          display: ({ chart }) => chart.height > 220,
          text: "WPM",
          color: "rgba(255,180,100,.9)",
          font: (ctx: any) => ({
            weight: 700,
            size: Math.max(14, Math.min(18, Math.round(ctx.chart.height / 18))),
          }),
          padding: { bottom: 10 },
        } as any,
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
        <Line
          data={data}
          options={{
            ...options,
            plugins: {
              ...options.plugins,
              // feed progress into reveal; keep guides off by default
              "bk-line-reveal": { progress: reveal },
              "bk-guides": { showGuides: false, avg, finishSec },
              "bk-frame-glow": {
                lineWidth: 2,
                shadowBlur: 16,
                colorCore: "rgba(255,140,30,0.9)",
                colorHalo: "rgba(255,110,20,0.35)",
                radius: 8,
              },
            } as any,
          }}
          width={w}
          height={h}
          plugins={[bkLineReveal, bkGuides, bkFrameGlow, bkGradientStroke]}
        />
      ) : (
        <div className="absolute inset-0 animate-pulse bg-white/5 rounded-lg" />
      )}
    </div>
  );
}