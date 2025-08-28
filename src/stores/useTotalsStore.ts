"use client";
import { create } from "zustand";
import { fetchMyTotals } from "@/lib/runsApi";
import { mark, measure } from "@/lib/perf";

type Totals = {
  ready: boolean;
  loading: boolean;
  totalXP: number;
  streakDays: number;
  bestWpm: number | null;
  avgWpm: number | null;
  avgAcc: number | null;
  hydrate: (force?: boolean) => Promise<void>;
};

export const useTotalsStore = create<Totals>((set, get) => ({
  ready: false,
  loading: false,
  totalXP: 0,
  streakDays: 0,
  bestWpm: null,
  avgWpm: null,
  avgAcc: null,
  hydrate: async (force?: boolean) => {
    if (get().loading) return;
    if (get().ready && !force) return;
    set({ loading: true });
    mark('stores:hydrate:totals:start');
    try {
      const res = await fetchMyTotals();
      const t = (res as any)?.totals ?? null;
      set({
        totalXP: Number(t?.totalXP ?? 0) || 0,
        streakDays: Number(t?.streakDays ?? 0) || 0,
        bestWpm: t?.bestWpm ?? null,
        avgWpm: t?.avgWpm ?? null,
        avgAcc: t?.avgAcc ?? null,
        ready: true,
      });
    } catch {
      set({ ready: true });
    } finally {
      set({ loading: false });
      mark('stores:hydrate:totals:end');
      measure('stores:hydrate:totals:start','stores:hydrate:totals:end');
    }
  },
}));


