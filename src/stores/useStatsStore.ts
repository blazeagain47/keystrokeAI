"use client";
import { create } from "zustand";
import { filterByRange, summarize, getLocalHistory, migrateLegacyHistory, RangeKey, BlazeRun } from "@/lib/historyLocal";

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
    try { const v = localStorage.getItem(RANGE_LS) as RangeKey | null; return v === "all" || v === "7d" || v === "1d" ? v : "7d"; } catch { return "7d"; }
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

  hydrate: async (uid: string) => {
    const runs = (() => {
      const mine = getLocalHistory(String(uid));
      return mine.length ? mine : migrateLegacyHistory(String(uid));
    })();
    set({ uid, history: runs, ready: true });
    get().recompute();
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
      } as unknown as BlazeRun & { accuracyPct?: number; completed?: boolean; isComplete?: boolean };

      const history = [...state.history, normalized as any];
      const inRange = filterByRange(history, state.range);
      const s = summarize(inRange);
      return { history, summary: s, totalXP: s.totalXP, streakDays: s.streakDays };
    });
  },
}));


