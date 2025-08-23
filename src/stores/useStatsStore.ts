"use client";
import { create } from "zustand";
import { filterByRange, summarize, getLocalHistory, migrateLegacyHistory, RangeKey, BlazeRun } from "@/lib/historyLocal";
import { normalizeMany, dedupeByIdThenTime } from "@/lib/historyNormalize";
import { computeXpAward } from "@/lib/xp";
import { isAbort } from "@/lib/isAbort";

type StatsState = {
  ready: boolean;
  uid?: string | null;
  range: RangeKey;
  history: BlazeRun[];
  summary: { sessions: number; avgWpm: number; avgAcc: number; totalXP: number; streakDays: number };
  totalXP: number;
  streakDays: number;
  setRange: (r: RangeKey) => void;
  hydrate: (uid: string) => Promise<void>;
  recompute: () => void;
  append: (run: BlazeRun) => void;
};

const RANGE_LS = "bk:range";

export const useStatsStore = create<StatsState>((set, get) => ({
  ready: false,
  uid: null,
  range: (() => {
    try { const v = localStorage.getItem(RANGE_LS) as RangeKey | null; return v === "all" || v === "7d" || v === "1d" ? v : "all"; } catch { return "all"; }
  })(),
  history: [],
  summary: { sessions: 0, avgWpm: 0, avgAcc: 0, totalXP: 0, streakDays: 0 },
  totalXP: 0,
  streakDays: 0,

  setRange: (r) => {
    set({ range: r });
    try { localStorage.setItem(RANGE_LS, r); } catch {}
    get().recompute();
  },

  hydrate: async (uid: string, opts?: { signal?: AbortSignal }) => {
    const id = String(uid);
    const local = (() => { try { return getLocalHistory(id); } catch { return []; } })() || [];
    let remote: any[] = [];
    try {
      const res = await fetch(`/api/stats/history?range=all`, { cache: "no-store", signal: opts?.signal });
      if (res.ok) remote = await res.json();
    } catch (e) { if (!isAbort(e)) console.warn("[stats.hydrate] history fetch failed:", e); }
    const merged = dedupeByIdThenTime(normalizeMany([...(local as any[]), ...(remote as any[])]));
    set({ uid: id, history: merged as any, ready: true });
    try { const { setLocalHistory } = await import("@/lib/historyLocal"); setLocalHistory(id, merged as any); } catch {}
    try { get().recompute(); } catch (e) { if (!isAbort(e)) console.warn("[stats.hydrate] recompute failed:", e); }
  },

  recompute: () => {
    const { range, history } = get();
    const inRange = filterByRange(history, range);
    const s = summarize(inRange);
    set({ summary: s, totalXP: s.totalXP, streakDays: s.streakDays });
  },

  append: (run: BlazeRun) => {
    set((state) => {
      // Normalize so downstream metrics don’t miss items
      const normalized = {
        ...run,
        // prefer run.accuracyPct, else run.accuracy, else run.acc
        accuracyPct:
          (run as any).accuracyPct ??
          (run as any).accuracy ??
          (run as any).acc ??
          undefined,
        completed: (run as any).completed ?? true,
        isComplete: (run as any).isComplete ?? true,
        xpDelta:
          (run as any).xpDelta ??
          (run as any).xpEarned ??
          (() => { try { return computeXpAward(Number((run as any).acc ?? (run as any).accuracy ?? 0))?.total ?? 0; } catch { return 0; } })(),
      } as unknown as BlazeRun & { accuracyPct?: number; completed?: boolean; isComplete?: boolean };

      const history = [...state.history, normalized as any];
      const inRange = filterByRange(history, state.range);
      const s = summarize(inRange);
      return { history, summary: s, totalXP: s.totalXP, streakDays: s.streakDays };
    });
  },
}));


