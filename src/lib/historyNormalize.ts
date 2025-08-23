// src/lib/historyNormalize.ts
export type NormalizedRun = {
  id: string;
  ts: number;               // epoch ms
  wpm: number;
  acc: number;              // 0..100
  durationSec?: number | null;
  mode?: string | null;
  words?: number | null;
  xpDelta?: number | null;  // may be 0
};

export function normalizeRun(raw: any): NormalizedRun | null {
  if (!raw) return null;
  const id = String(raw.id ?? raw._id ?? raw.uuid ?? raw.ts ?? Date.now());
  const ts = toMs(raw.ts ?? raw.createdAt ?? raw.date ?? Date.now());
  const wpm = num(raw.wpm ?? raw.speed ?? 0) as number;
  const acc = num(raw.acc ?? raw.accuracy ?? raw.accuracyPct ?? 0) as number;
  const durationSec = num(raw.durationSec ?? raw.duration ?? null, true);
  const mode = str(raw.mode);
  const words = num(raw.words ?? raw.wordsCount ?? null, true);
  const xpDelta = num(raw.xpDelta ?? raw.xpEarned ?? null, true);
  return { id, ts, wpm, acc, durationSec, mode, words, xpDelta };
}

export function normalizeMany(list: any[]): NormalizedRun[] {
  return (Array.isArray(list) ? list : [])
    .map(normalizeRun)
    .filter(Boolean) as NormalizedRun[];
}

export function dedupeByIdThenTime(runs: NormalizedRun[]): NormalizedRun[] {
  const byId = new Map<string, NormalizedRun>();
  for (const r of runs) byId.set(r.id, r);
  // also dedupe rough duplicates by (ts ± 2s, wpm, acc)
  const seen = new Map<string, NormalizedRun>();
  for (const r of byId.values()) {
    const key = `${Math.round(r.ts / 2000)},${Math.round(r.wpm)},${Math.round(r.acc)}`;
    seen.set(key, r);
  }
  return Array.from(seen.values()).sort((a, b) => a.ts - b.ts);
}

function toMs(v: any): number {
  if (typeof v === "number") return v;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d.getTime() : Date.now();
}
function num(v: any, allowNull = false): number | null {
  if (v == null) return allowNull ? null : 0;
  const n = Number(v);
  if (!Number.isFinite(n)) return allowNull ? null : 0;
  return n;
}
function str(v: any): string | null {
  if (v == null) return null;
  const s = String(v);
  return s.length ? s : null;
}

// ----- Local-day bucketing -----
export const DAY = 24 * 60 * 60 * 1000;

export function startOfLocalDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function inLastNDaysLocal(ts: number, n: number): boolean {
  const start = startOfLocalDay(Date.now() - (n - 1) * DAY); // inclusive of today counts as day 1
  return ts >= start;
}

export function isTodayLocal(ts: number): boolean {
  return startOfLocalDay(ts) === startOfLocalDay(Date.now());
}

export function computeStreakDays(runs: NormalizedRun[]): number {
  if (!runs?.length) return 0;
  const days = Array.from(
    new Set(runs.map(r => startOfLocalDay(r.ts)))
  ).sort((a, b) => a - b);
  if (!days.length) return 0;
  let streak = 1;
  let prev = days[days.length - 1];
  for (let i = days.length - 2; i >= 0; i--) {
    const d = days[i];
    if (d === prev - DAY) { streak++; prev = d; }
    else if (d === prev) { continue; }
    else { break; }
  }
  return streak;
}

