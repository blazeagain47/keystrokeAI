"use client";
export type BlazeRun = {
	id: string;
	ts: number;           // epoch ms
	wpm: number;
	acc: number;          // 0..100
	durationSec: number;
	mode: string;         // "words" | "time" | ...
	words?: number;       // optional count
	difficulty?: "Easy" | "Medium" | "Hard" | string;
	xpEarned?: number;
	xpDelta?: number;     // per-run delta used for totals
	xpReason?: string;    // e.g., "≥95% accuracy"
};

const KEY = (uid: string) => `bk:history:${uid}`;

export function getLocalHistory(uid: string): BlazeRun[] {
	try { return JSON.parse(localStorage.getItem(KEY(uid)) || "[]") as BlazeRun[]; } catch { return []; }
}
export function setLocalHistory(uid: string, runs: BlazeRun[]) {
	localStorage.setItem(KEY(uid), JSON.stringify(runs.slice(0, 1000))); // cap
}
export function addLocalRun(uid: string, run: BlazeRun) {
	const cur = getLocalHistory(uid);
	cur.unshift(run);
	setLocalHistory(uid, cur);
}

export type RangeKey = "all" | "7d" | "1d";

export function filterByRange(runs: BlazeRun[], range: RangeKey): BlazeRun[] {
	if (range === "all") return runs;
	const now = Date.now();
	const ms = range === "7d" ? 7*24*3600*1000 : 24*3600*1000;
	return runs.filter(r => now - r.ts <= ms);
}

export function summarize(runs: BlazeRun[]) {
	const total = runs.length;
	const avgWpm = total ? Math.round(runs.reduce((a,r)=>a+r.wpm,0)/total) : 0;
	const avgAcc = total ? Math.round(runs.reduce((a,r)=>a+r.acc,0)/total) : 0;
	const xp = runs.reduce((a,r)=> a + (Number(r.xpDelta ?? r.xpEarned)||0), 0);
	// streak = consecutive daily days ending today
	const days = new Set(runs.map(r => new Date(r.ts).toDateString()));
	let streak = 0, d = new Date(); d.setHours(0,0,0,0);
	while (days.has(d.toDateString())) { streak++; d = new Date(d.getTime()-24*3600*1000); }
	return { sessions: total, avgWpm, avgAcc, totalXpFromRuns: xp, streak };
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



