"use client";
import { create } from "zustand";
import { RangeKey, getLocalHistory, filterByRange, summarize, toDailySeries, BlazeRun, setLocalHistory } from "@/lib/historyLocal";

type Summary = { totalXp?: number; streakDays?: number; memberSince?: string; avgWpm: number; avgAcc: number; sessions: number };
type Point = { t: string; wpm: number; acc: number };

type State = {
	range: RangeKey;
	loading: boolean;
	error: string | null;
	summary: Summary | null;
	history: Point[] | null;
	totalXP: number;
	hydrate: (uid: string) => Promise<void>;
	setRange: (r: RangeKey, uid: string) => Promise<void>;
	ingestLocal: (uid: string, run: BlazeRun) => void;
	addXp: (d: number) => void;
	ingestRun: (uid: string, run: BlazeRun) => void;
};

async function fetchJSON<T>(url: string) {
	const r = await fetch(url, { cache: "no-store", credentials: "include" });
	if (!r.ok) throw new Error(`HTTP ${r.status}`);
	return (await r.json()) as T;
}

export const useStatsStore = create<State>((set, get) => ({
	range: "7d",
	loading: false,
	error: null,
	summary: null,
	history: null,
	totalXP: 0,

	hydrate: async (uid: string) => {
		const range = get().range;
		set({ loading: true, error: null });
		try {
			// Try proxy endpoints first:
			const [sum, hist] = await Promise.all([
				fetchJSON<any>(`/api/stats/summary?range=${range}`),
				fetchJSON<Point[]>(`/api/stats/history?granularity=daily&range=${range}`)
			]);
			if ((sum as any)?.detail === "fallback") {
				const local = getLocalHistory(uid);
				const scoped = filterByRange(local, range);
				const s = summarize(scoped);
				const points = toDailySeries(scoped, range === "1d" ? 1 : 7);
				set({
					summary: {
						totalXp: s.totalXpFromRuns,
						streakDays: s.streak,
						memberSince: local.length ? new Date(local[local.length-1].ts).toISOString() : undefined,
						avgWpm: s.avgWpm, avgAcc: s.avgAcc, sessions: s.sessions,
					},
					history: points,
					loading: false,
					totalXP: s.totalXpFromRuns ?? 0,
				});
			} else {
				const backendXP = Number((sum as any)?.totalXp ?? (sum as any)?.totalXP ?? (sum as any)?.total_xp ?? (sum as any)?.xp ?? 0);
				set({ summary: sum as Summary, history: hist, loading: false, totalXP: isFinite(backendXP) ? backendXP : 0 });
			}
		} catch {
			// Fallback to local history
			const local = getLocalHistory(uid);
			const scoped = filterByRange(local, range);
			const sum = summarize(scoped);
			const points = toDailySeries(scoped, range === "1d" ? 1 : 7);
			set({
				summary: {
					totalXp: sum.totalXpFromRuns,
					streakDays: sum.streak,
					memberSince: local.length ? new Date(local[local.length-1].ts).toISOString() : undefined,
					avgWpm: sum.avgWpm, avgAcc: sum.avgAcc, sessions: sum.sessions,
				},
				history: points,
				loading: false,
				totalXP: sum.totalXpFromRuns ?? 0,
			});
		}
	},

	setRange: async (r: RangeKey, uid: string) => {
		set({ range: r });
		await get().hydrate(uid);
	},

	ingestLocal: (uid: string, run: BlazeRun) => {
		const local = getLocalHistory(uid);
		local.unshift(run);
		setLocalHistory(uid, local);
		// recompute current range view
		const scoped = filterByRange(local, get().range);
		const sum = summarize(scoped);
		const points = toDailySeries(scoped, get().range === "1d" ? 1 : 7);
		set({
			summary: {
				totalXp: sum.totalXpFromRuns,
				streakDays: sum.streak,
				memberSince: local.length ? new Date(local[local.length-1].ts).toISOString() : undefined,
				avgWpm: sum.avgWpm, avgAcc: sum.avgAcc, sessions: sum.sessions,
			},
			history: points,
			totalXP: Math.max(0, (get().totalXP || 0) + (Number(run.xpDelta ?? run.xpEarned) || 0)),
		});
	},

	addXp: (d: number) => set(s => ({ totalXP: Math.max(0, (s.totalXP || 0) + (Number(d) || 0)) })),
	ingestRun: (uid: string, run: BlazeRun) => {
		get().ingestLocal(uid, run);
	},
}));


