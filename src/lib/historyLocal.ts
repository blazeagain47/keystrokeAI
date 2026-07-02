"use client";
export type BlazeRun = {
	id: string; ts: number; wpm: number; acc: number; durationSec: number;
	mode: string; words?: number; difficulty?: string; xpEarned?: number;
	xpDelta?: number; xpReason?: string;
};

const keyFor = (uid: string) => `bk:history:${uid}`;

export function getLocalHistory(uid: string): BlazeRun[] {
	try {
		const raw = localStorage.getItem(keyFor(uid));
		return raw ? JSON.parse(raw) as BlazeRun[] : [];
	} catch { return []; }
}
export function setLocalHistory(uid: string, runs: BlazeRun[]) {
	try { localStorage.setItem(keyFor(uid), JSON.stringify(runs)); } catch {}
}
export function addLocalRun(uid: string, run: BlazeRun) {
	const runs = getLocalHistory(uid);
	runs.unshift(run);
	setLocalHistory(uid, runs);
}

export type RangeKey = "all" | "7d" | "1d";

export function filterByRange(runs: BlazeRun[], range: RangeKey): BlazeRun[] {
	if (range === "all") return runs;
	try {
		const helpers = require("@/lib/historyNormalize");
		if (range === "1d") return runs.filter(r => helpers.isTodayLocal(Number((r as any).ts)));
		if (range === "7d") return runs.filter(r => helpers.inLastNDaysLocal(Number((r as any).ts), 7));
		return runs;
	} catch {
		const now = Date.now();
		const ms = range === "7d" ? 7*24*60*60*1000 : 24*60*60*1000;
		return runs.filter(r => now - r.ts <= ms);
	}
}

export function summarize(runs: BlazeRun[]) {
  if (!runs?.length) return { sessions: 0, avgWpm: 0, avgAcc: 0, totalXP: 0, streakDays: 0 };
  let w = 0, a = 0, xp = 0;
  for (const r of runs) {
    w += Number(r.wpm ?? 0);
    a += Number(r.acc ?? 0);
    xp += Number((r as any).xpDelta ?? (r as any).xpEarned ?? 0);
  }
  const n = runs.length;
  const streakDays = computeStreakDays(runs);
  return {
    sessions: n,
    avgWpm: Math.round(w / n),
    avgAcc: Math.round(a / n),
    totalXP: xp,
    streakDays,
  };
}

// ---- Streak helpers -------------------------------------------------------
const DAY = 24 * 60 * 60 * 1000;

function startOfLocalDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Consecutive-day streak ending at the most-recent run day.
 * Multiple runs per day count as 1 for the day.
 */
export function computeStreakDays(runs: BlazeRun[]): number {
  if (!runs?.length) return 0;
  const days = Array.from(
    new Set(
      runs
        .map(r => startOfLocalDay(Number(r.ts ?? Date.now())))
        .filter(Boolean)
        .sort((a, b) => a - b)
    )
  );
  if (!days.length) return 0;
  let streak = 1;
  let prev = days[days.length - 1];
  for (let i = days.length - 2; i >= 0; i--) {
    const d = days[i];
    if (d === prev) continue;
    if (d === prev - DAY) {
      streak++;
      prev = d;
    } else {
      break;
    }
  }
  return streak;
}

export function toDailySeries(runs: BlazeRun[], daysBack = 7) {
	const dayMs = 24*3600*1000;
	const now = new Date(); now.setHours(0,0,0,0);
	const buckets = Array.from({length: daysBack}, (_,i) => {
		const t0 = now.getTime() - (daysBack-1-i)*dayMs;
		const label = new Date(t0).toISOString();
		return { t: label, wpm: 0, acc: 0, n: 0 };
	});
	runs.forEach(r=>{
		const d0 = new Date(r.ts); d0.setHours(0,0,0,0);
		const idx = Math.round((d0.getTime() - (now.getTime()- (daysBack-1)*dayMs)) / dayMs);
		if (idx>=0 && idx<buckets.length) {
			buckets[idx].wpm += r.wpm; buckets[idx].acc += r.acc; buckets[idx].n++;
		}
	});
	return buckets.map(b => ({ t: b.t, wpm: b.n ? Math.round(b.wpm/b.n) : 0, acc: b.n ? Math.round(b.acc/b.n) : 0 }));
}

// NOTE: we intentionally do NOT scavenge "any run-shaped array sitting under
// some other localStorage key" and adopt it into a user's history bucket.
// That used to exist as a guardrail for migrating pre-account "guest" data,
// but on a shared browser it will just as happily hand a *brand new* account
// the previous account's cached run history (wrong stats, wrong session
// count, etc.) — which is a data-integrity bug, not a feature. Local storage
// is purely a cache of server-authoritative data (Postgres/Firestore) keyed
// by the current user's identity; if a bucket is empty, it's empty.



