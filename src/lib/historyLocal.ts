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
	const now = Date.now();
	const ms = range === "7d" ? 7*24*60*60*1000 : 24*60*60*1000;
	return runs.filter(r => now - r.ts <= ms);
}

export function summarize(runs: BlazeRun[]) {
	if (!runs.length) return { sessions: 0, avgWpm: 0, avgAcc: 0, totalXP: 0 };
	let w=0, a=0, xp=0;
	for (const r of runs) { w += r.wpm || 0; a += r.acc || 0; xp += r.xpEarned || 0; }
	const n = runs.length;
	return { sessions: n, avgWpm: Math.round(w/n), avgAcc: Math.round(a/n), totalXP: xp };
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

// --- NEW: migrate legacy/unknown user keys so old runs show up ----
export function migrateLegacyHistory(uid: string): BlazeRun[] {
	if (!uid) return [];
	const current = getLocalHistory(uid);
	if (current.length) return current;

	let bestKey: string | null = null;
	let bestRuns: BlazeRun[] = [];
	const looksLikeRun = (o: any) =>
		o && typeof o === "object" &&
		typeof o.ts === "number" &&
		typeof o.wpm === "number" &&
		typeof o.acc === "number";

	try {
		for (let i = 0; i < localStorage.length; i++) {
			const k = localStorage.key(i) || "";
			// ignore our target bucket to avoid self-pick
			if (k === `bk:history:${uid}`) continue;

			const raw = localStorage.getItem(k);
			if (!raw) continue;

			// Must be a JSON array with run-like objects
			let parsed: any;
			try { parsed = JSON.parse(raw); } catch { continue; }
			if (!Array.isArray(parsed) || parsed.length === 0) continue;
			if (!looksLikeRun(parsed[0])) continue;

			if (parsed.length > bestRuns.length) {
				bestRuns = parsed as BlazeRun[];
				bestKey = k;
			}
		}

		if (bestRuns.length) {
			// Non-destructive: copy into new user bucket
			setLocalHistory(uid, bestRuns);
			return bestRuns;
		}
	} catch { /* no-op */ }
	return [];
}



