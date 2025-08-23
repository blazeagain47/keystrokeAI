// src/lib/typingMetrics.ts
export function clamp01(x: number) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

/** Simple N-point moving average over numbers. Empty -> [] */
export function movingAverage(xs: number[], win = 5): number[] {
  const n = Array.isArray(xs) ? xs.length : 0;
  if (n === 0 || win <= 1) return xs?.slice() ?? [];
  const res: number[] = [];
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const v = Number(xs[i] ?? 0);
    if (Number.isFinite(v)) sum += v;
    if (i >= win) sum -= Number(xs[i - win] ?? 0);
    if (i >= win - 1) res.push(sum / win);
  }
  return res;
}

/** Ignore the first `drop` seconds (startup noise), then MA(win), then max. */
export function peakFromSeries(wpmSeries: number[], { drop = 3, win = 5 }: { drop?: number; win?: number } = {}) {
  const cleaned = (wpmSeries ?? []).map((v) => Number(v)).filter((v) => Number.isFinite(v));
  const trimmed = cleaned.slice(Math.max(0, drop));
  if (!trimmed.length) return 0;
  const ma = movingAverage(trimmed, win);
  return ma.length ? Math.max(...ma) : Math.max(...trimmed);
}

/** Consistency as 100 * (1 - stdev/mean) on the smoothed series. */
export function consistencyFromSeries(wpmSeries: number[], { drop = 3, win = 5 }: { drop?: number; win?: number } = {}) {
  const cleaned = (wpmSeries ?? []).map((v) => Number(v)).filter((v) => Number.isFinite(v));
  const trimmed = cleaned.slice(Math.max(0, drop));
  if (!trimmed.length) return 0;
  const ma = movingAverage(trimmed, win);
  const xs = ma.length ? ma : trimmed;
  const n = xs.length;
  if (!n) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / n;
  if (mean <= 0 || !Number.isFinite(mean)) return 0;
  const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const stdev = Math.sqrt(variance);
  const cv = stdev / mean; // smaller is better
  return Math.round(100 * clamp01(1 - clamp01(cv)));
}

export type RunSnapshot = {
  mode: "words" | "time" | "quote" | "zen" | "custom";
  durationSec?: number | null;
  wordCount?: number | null;
};

/** Pick comparison runs from history that match mode and are duration/words comparable */
export function comparableRuns(
  history: Array<{ wpm?: number | null; mode?: string | null; durationSec?: number | null; words?: number | null }>,
  snap?: RunSnapshot | null
) {
  if (!Array.isArray(history) || !history.length || !snap) return [];
  const mode = String(snap.mode || "").toLowerCase();
  const isTime = mode === "time";
  const isWords = mode === "words";
  const dur = Number(snap.durationSec ?? 0) || 0;
  const wc = Number(snap.wordCount ?? 0) || 0;

  return history.filter((r) => {
    const rMode = String(r.mode || "").toLowerCase();
    if (rMode !== mode) return false;
    if (isTime) {
      const rd = Number(r.durationSec ?? 0) || 0;
      if (rd <= 0 || dur <= 0) return false;
      const tol = Math.max(10, Math.round(0.15 * dur)); // ±15% or ±10s
      return Math.abs(rd - dur) <= tol;
    }
    if (isWords) {
      const rw = Number((r as any).words ?? (r as any).wordsCount ?? 0) || 0;
      // exact match or within ±2 words
      return rw > 0 && wc > 0 && Math.abs(rw - wc) <= 2;
    }
    // for other modes, allow everything with same mode
    return true;
  });
}

/** Baseline WPM from comparable runs (mean) */
export function baselineWpmFromHistory(
  history: Array<{ wpm?: number | null; mode?: string | null; durationSec?: number | null; words?: number | null }>,
  snap?: RunSnapshot | null
) {
  const runs = comparableRuns(history, snap);
  if (!runs.length) return null;
  const nums = runs.map((r) => Number(r.wpm ?? 0)).filter((x) => Number.isFinite(x));
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/**
 * Smooth and de-noise a WPM series for CHART DISPLAY ONLY.
 * - Drops the first N seconds (startup noise)
 * - Applies moving average
 * - Clips extreme outliers by percentile (e.g., a single spike)
 * - Floors negatives to 0
 */
export function sanitizeWpmForChart(
  series: number[],
  {
    drop = 3,
    win = 5,
    clipP = 0.98,
    floor = 0,
  }: { drop?: number; win?: number; clipP?: number; floor?: number } = {}
): number[] {
  const cleaned = (series ?? []).map(Number).filter(Number.isFinite);
  const trimmed = cleaned.slice(Math.max(0, drop));
  if (!trimmed.length) return [];

  // movingAverage already exists; if it returns empty, fall back to trimmed
  const ma = movingAverage(trimmed, win);
  const xs = ma?.length ? ma : trimmed;

  // clip at P98 to remove a single wild point
  const sorted = [...xs].sort((a, b) => a - b);
  const pIdx = Math.min(sorted.length - 1, Math.floor(sorted.length * clipP));
  const cap = sorted[pIdx] ?? sorted.at(-1) ?? 0;

  return xs.map((v) => Math.max(floor, Math.min(v, cap)));
}

/**
 * Optional helper if/when we want a more stable source series:
 * convert per-second char counts into a rolling-window WPM.
 *   perSecondChars[i] = chars typed during second i (delta of cumulative)
 */
export function rollingWindowWpm(perSecondChars: number[], windowSec = 3): number[] {
  const w = Math.max(1, Math.floor(windowSec));
  if (!perSecondChars?.length) return [];
  const out: number[] = [];
  let sum = 0;
  for (let i = 0; i < perSecondChars.length; i++) {
    sum += perSecondChars[i] ?? 0;
    if (i >= w) sum -= perSecondChars[i - w] ?? 0;
    // words = chars/5; minutes = windowSec/60
    const wpm = (sum / 5) / (w / 60);
    out.push(wpm);
  }
  return out;
}


