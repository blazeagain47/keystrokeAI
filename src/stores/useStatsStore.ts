"use client";
import { create } from "zustand";
import { filterByRange, summarize, getLocalHistory, setLocalHistory, migrateLegacyHistory, RangeKey, BlazeRun } from "@/lib/historyLocal";
import { normalizeMany, dedupeByIdThenTime } from "@/lib/historyNormalize";
import { computeXpAward } from "@/lib/xp";
import { isAbort } from "@/lib/isAbort";
import { mark, measure } from "@/lib/perf";

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
    mark('stores:hydrate:stats:start');
    const id = String(uid);
    let local = (() => { try { return getLocalHistory(id); } catch { return []; } })() || [];
    // Guardrail: if this user's bucket is empty (e.g. first hydrate after a
    // fresh login on a browser that previously only had a guest/legacy
    // bucket), try to recover any run-shaped history sitting under another
    // key before assuming there's genuinely nothing local.
    if (!local.length) {
      try { local = migrateLegacyHistory(id); } catch { /* no-op */ }
    }
    let remote: any[] = [];
    let remoteFailed = false;
    try {
      const res = await fetch(`/api/stats/history?range=all`, { cache: "no-store", signal: opts?.signal });
      if (res.ok) remote = await res.json();
      else remoteFailed = true;
    } catch (e) {
      if (!isAbort(e)) { console.warn("[stats.hydrate] history fetch failed:", e); remoteFailed = true; }
    }
    // Union local + remote rather than trusting either alone: protects
    // against a transient/misconfigured server read (remote=[]) wiping out
    // real local history, and against local being stale/behind the server.
    const merged = dedupeByIdThenTime(normalizeMany([...(local as any[]), ...(remote as any[])]));
    set({ uid: id, history: merged as any, ready: true });
    try { setLocalHistory(id, merged as any); } catch {}
    if (remoteFailed && process.env.NODE_ENV !== "production") {
      console.warn("[stats.hydrate] server history unavailable — showing local-only data for", id);
    }
    try { get().recompute(); } catch (e) { if (!isAbort(e)) console.warn("[stats.hydrate] recompute failed:", e); }
    mark('stores:hydrate:stats:end');
    measure('stores:hydrate:stats:start','stores:hydrate:stats:end');
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
      // Guardrail: persist immediately. Without this, a completed run only
      // ever lived in memory — navigating away and back (e.g. to /account)
      // would call hydrate() again, which reads localStorage + server and
      // would silently lose any run that hadn't made that round trip yet.
      if (state.uid) {
        try { setLocalHistory(state.uid, history); } catch {}
      }
      return { history, summary: s, totalXP: s.totalXP, streakDays: s.streakDays };
    });
  },
}));


