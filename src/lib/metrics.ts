export type SeriesPoint = number | { v: number };

/** Returns basic stats for a numeric series (min, max, avg, stdev). */
export function seriesStats(series?: SeriesPoint[]) {
  if (!series || !series.length) return null as null | { n: number; avg: number; min: number; max: number; stdev: number };
  const nums = series
    .map((p: any) => (typeof p === 'number' ? p : p?.v ?? 0))
    .filter((n: any) => Number.isFinite(n));
  if (!nums.length) return null as null | { n: number; avg: number; min: number; max: number; stdev: number };
  const n = nums.length;
  const sum = nums.reduce((a, b) => a + b, 0);
  const avg = sum / n;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const variance = nums.reduce((acc, x) => acc + (x - avg) ** 2, 0) / n;
  const stdev = Math.sqrt(variance);
  return { n, avg, min, max, stdev };
}

/** Simple stability index: lower stdev vs avg is more stable. Returns 0..100. */
export function stabilityIndex(series?: SeriesPoint[]) {
  const s = seriesStats(series);
  if (!s || s.avg <= 0) return null as number | null;
  const ratio = s.stdev / s.avg; // smaller is better
  const score = 100 * Math.max(0, 1 - Math.min(1, ratio)); // clamp
  return Math.round(score);
}

/** Corrections per 60s (corrections rate). */
export function correctionsPerMin(correct?: number | null, error?: number | null, durationSec?: number | null) {
  if (!Number.isFinite(error as number) || !Number.isFinite(durationSec as number) || !durationSec) return null as number | null;
  return Math.round(((error as number) / (durationSec as number)) * 60);
}

/** Projected WPM gain if corrections drop by target% (e.g., 0.3 = 30%). */
export function projectedWpmGain(currentWpm?: number | null, currentCorrections?: number | null, recentCorrectionsAvg?: number | null, targetDrop = 0.3) {
  if (!Number.isFinite(currentWpm as number) || !Number.isFinite(currentCorrections as number)) return null as number | null;
  const baseline = Number.isFinite(recentCorrectionsAvg as number) ? (recentCorrectionsAvg as number) : (currentCorrections as number);
  if (!baseline) return null as number | null;
  const drop = Math.max(0, baseline * targetDrop);
  const factor = Math.min(0.2, drop / Math.max(1, baseline)); // cap +20%
  return Math.max(0, Math.round((currentWpm as number) * factor));
}


