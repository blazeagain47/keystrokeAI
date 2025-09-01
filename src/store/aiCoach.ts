"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type Beta = { a: number; b: number };
type Welford = { n: number; mean: number; m2: number };

type LetterKey = string;
type DiKey = string;

type AccLat = { acc: Beta; lat: Welford };
type FeatureMap = Record<string, AccLat>;

export type AICoachIntensity = "low" | "med" | "high";

export interface AICoachState {
  enabled: boolean;
  includeDigraphs: boolean;
  intensity: AICoachIntensity;

  letters: FeatureMap;
  digraphs: FeatureMap;

  _lastDownAt?: number | null;
  _lastChar?: string | null;

  lastSnapshot?: { letters: FeatureMap; digraphs: FeatureMap } | null;
  lastDeltas?: {
    letters: Array<{ k: string; dAcc: number; dLat: number }>;
    digraphs: Array<{ k: string; dAcc: number; dLat: number }>;
    ts?: number;
  } | null;
  status: "empty" | "ready" | "post" | "retestDue";
  drillsSinceRetest: number;

  resetRun(): void;
  noteKeystroke(args: {
    char: string;
    correct: boolean;
    tsDown: number;
    tsPrevDown?: number | null;
    prevChar?: string | null;
  }): void;
  commitRun(): void;

  getTopWeak(opts?: { nChars?: number; nDigraphs?: number }): {
    letters: Array<{ k: string; score: number }>;
    digraphs: Array<{ k: string; score: number }>;
  };

  buildPracticeWordset(candidates: string[], n?: number): string[];
}

const clampLetter = (ch: string) => (/[a-z0-9]/.test(ch) ? ch : "");
const digraphKey = (a?: string | null, b?: string | null) =>
  a && b && a.length === 1 && b.length === 1 ? `${a}${b}` : "";

function updBeta(x: Beta, success: boolean): Beta {
  return { a: x.a + (success ? 1 : 0), b: x.b + (success ? 0 : 1) };
}
function updWelford(w: Welford, sampleMs: number): Welford {
  const n = w.n + 1;
  const delta = sampleMs - w.mean;
  const mean = w.mean + delta / n;
  const m2 = w.m2 + delta * (sampleMs - mean);
  return { n, mean, m2 };
}
function betaMean(x: Beta) { return x.a / Math.max(1, x.a + x.b); }
function betaSample(x: Beta) {
  const gamma = (k: number) => {
    const d = k - 1/3, c = 1/Math.sqrt(9*d);
    let u=0, v=0;
    while (u===0) u = Math.random();
    while (v===0) v = Math.random();
    const z = Math.sqrt(-2*Math.log(u)) * Math.cos(2*Math.PI*v);
    let gx = d * Math.pow(1 + c*z, 3);
    while (gx <= 0) {
      while (u===0) u = Math.random();
      while (v===0) v = Math.random();
      const zz = Math.sqrt(-2*Math.log(u)) * Math.cos(2*Math.PI*v);
      gx = d * Math.pow(1 + c*zz, 3);
    }
    return gx;
  };
  const a = Math.max(1e-3, x.a), b = Math.max(1e-3, x.b);
  const g1 = gamma(a), g2 = gamma(b);
  return g1 / (g1 + g2);
}

const defaultBeta = (): Beta => ({ a: 2, b: 2 });
const defaultW = (): Welford => ({ n: 0, mean: 140, m2: 0 });

// Evidence thresholds (tuned for typing cadence)
// A letter should have at least 10 judged keystrokes OR 6 latency observations.
const PRIOR_A = 2, PRIOR_B = 2;                 // your defaults
const MIN_ACC_OBS = 10;                         // (a+b) - prior >= 10
const MIN_LAT_N   = 6;                          // Welford.n >= 6
const MIN_SHOW    = 1;                          // show at least 1 chip if anything eligible

function accObs(v: { acc: { a:number; b:number }}) {
  return Math.max(0, (v.acc.a + v.acc.b) - (PRIOR_A + PRIOR_B));
}
function eligible(v: { acc: {a:number;b:number}; lat: {n:number} }) {
  return accObs(v) >= MIN_ACC_OBS || v.lat.n >= MIN_LAT_N;
}

const selectLetters = "abcdefghijklmnopqrstuvwxyz0123456789".split("");

export const useAICoach = create<AICoachState>()(
  persist(
    (set, get) => ({
      enabled: true,
      includeDigraphs: true,
      intensity: "med",

      letters: Object.fromEntries(selectLetters.map(ch => [ch, { acc: defaultBeta(), lat: defaultW() }])),
      digraphs: {},

      _lastDownAt: null,
      _lastChar: null,

      lastSnapshot: null,
      lastDeltas: null,
      status: "ready",
      drillsSinceRetest: 0,

      resetRun() {
        const s = get();
        set({ 
          _lastDownAt: null, 
          _lastChar: null,
          lastSnapshot: { 
            letters: structuredClone(s.letters), 
            digraphs: structuredClone(s.digraphs) 
          }, 
          status: s.status ?? "ready" 
        });
      },

      noteKeystroke({ char, correct, tsDown, tsPrevDown, prevChar }) {
        if (!get().enabled) return;
        const c = clampLetter(char);
        if (!c) return;

        set((s) => {
          const letters = { ...s.letters } as FeatureMap;
          const l = letters[c] ?? { acc: defaultBeta(), lat: defaultW() };
          l.acc = updBeta(l.acc, !!correct);
          if (tsPrevDown && tsPrevDown > 0) {
            const flight = Math.max(10, Math.min(800, tsDown - tsPrevDown));
            l.lat = updWelford(l.lat, flight);
          }
          letters[c] = l;

          let digraphs = s.digraphs as FeatureMap;
          if (s.includeDigraphs) {
            const dk = digraphKey(prevChar, c);
            if (dk) {
              digraphs = { ...digraphs };
              const d = digraphs[dk] ?? { acc: defaultBeta(), lat: defaultW() };
              d.acc = updBeta(d.acc, !!correct);
              if (tsPrevDown && tsPrevDown > 0) {
                const flight = Math.max(10, Math.min(800, tsDown - tsPrevDown));
                d.lat = updWelford(d.lat, flight);
              }
              digraphs[dk] = d;
            }
          }

          return { letters, digraphs, _lastDownAt: tsDown, _lastChar: c };
        });
      },

      commitRun() {
        const s = get();
        const pre = s.lastSnapshot;
        if (pre) {
          const delLetters: Array<{k:string; dAcc:number; dLat:number}> = [];
          for (const [k, post] of Object.entries(s.letters)) {
            const before = pre.letters[k];
            if (!before) continue;
            const accPre  = before.acc.a / Math.max(1, before.acc.a + before.acc.b);
            const accPost = post.acc.a   / Math.max(1, post.acc.a   + post.acc.b);
            const dAcc = +(accPost - accPre).toFixed(3);
            const dLat = +((before.lat.mean ?? 0) - (post.lat.mean ?? 0)).toFixed(1);
            if (dAcc || dLat) delLetters.push({ k, dAcc, dLat });
          }
          delLetters.sort((a,b) => (Math.abs(b.dAcc) + Math.abs(b.dLat/100)) - (Math.abs(a.dAcc) + Math.abs(a.dLat/100)));

          const delDig: Array<{k:string; dAcc:number; dLat:number}> = [];
          for (const [k, post] of Object.entries(s.digraphs)) {
            const before = pre.digraphs[k]; if (!before) continue;
            const accPre  = before.acc.a / Math.max(1, before.acc.a + before.acc.b);
            const accPost = post.acc.a   / Math.max(1, post.acc.a   + post.acc.b);
            const dAcc = +(accPost - accPre).toFixed(3);
            const dLat = +((before.lat.mean ?? 0) - (post.lat.mean ?? 0)).toFixed(1);
            if (dAcc || dLat) delDig.push({ k, dAcc, dLat });
          }
          delDig.sort((a,b) => (Math.abs(b.dAcc) + Math.abs(b.dLat/100)) - (Math.abs(a.dAcc) + Math.abs(a.dLat/100)));

          const drills = Math.min(2, (s.drillsSinceRetest ?? 0) + 1);
          set({ 
            lastDeltas: { letters: delLetters.slice(0,3), digraphs: delDig.slice(0,2), ts: Date.now() },
            status: drills >= 2 ? "retestDue" : "post",
            drillsSinceRetest: drills
          });

          if (process.env.NODE_ENV !== "production") {
            console.debug("[coach] deltas", get().lastDeltas);
          }
        } else {
          set({ status: "ready" });
        }
      },

      getTopWeak({ nChars = 3, nDigraphs = 2 } = {}) {
        const s = get();

        // Letters: filter by evidence; compute weakness; sort by score then by evidence volume
        const letterAll = Object.entries(s.letters)
          .filter(([,v]) => eligible(v))
          .map(([k, v]) => {
            const acc = v.acc.a / Math.max(1, v.acc.a + v.acc.b);
            const sigma = v.lat.n > 1 ? Math.sqrt(v.lat.m2 / Math.max(1, v.lat.n - 1)) : 80;
            const lat = v.lat.mean + 0.4 * sigma;
            const score = (1 - acc) * 0.65 + Math.min(1, (lat / 200)) * 0.35;
            const evid = accObs(v) + v.lat.n;
            return { k, score, evid };
          });

        // If we still have nothing, return empty (card will show "We're learning…")
        const letterScores = letterAll
          .sort((a,b) => (b.score - a.score) || (b.evid - a.evid) || (a.k < b.k ? -1 : 1))
          .slice(0, Math.max(MIN_SHOW, nChars))
          .map(({k,score}) => ({k,score}));

        // Digraphs: only those we have ever seen + some evidence
        const diAll = Object.entries(s.digraphs)
          .filter(([,v]) => eligible(v))
          .map(([k, v]) => {
            const acc = v.acc.a / Math.max(1, v.acc.a + v.acc.b);
            const sigma = v.lat.n > 1 ? Math.sqrt(v.lat.m2 / Math.max(1, v.lat.n - 1)) : 80;
            const lat = v.lat.mean + 0.4 * sigma;
            const score = (1 - acc) * 0.7 + Math.min(1, (lat / 220)) * 0.3;
            const evid = accObs(v) + v.lat.n;
            return { k, score, evid };
          });

        const diScores = diAll
          .sort((a,b) => (b.score - a.score) || (b.evid - a.evid) || (a.k < b.k ? -1 : 1))
          .slice(0, Math.max(0, nDigraphs))
          .map(({k,score}) => ({k,score}));

        return { letters: letterScores, digraphs: diScores };
      },

      buildPracticeWordset(
        baseWords: string[],
        n = 30,
        opts?: {
          epsilon?: number;           // fraction random explore
          maxPerFeature?: number;     // cap per letter/digraph fraction
          minUniqueStems?: number;    // ensure variety of stems
        }
      ): string[] {
        const epsilon = opts?.epsilon ?? 0.1;
        const maxCap = Math.max(1, Math.floor((opts?.maxPerFeature ?? 0.3) * n));
        const minUnique = Math.max(1, Math.floor((opts?.minUniqueStems ?? 0.8) * n));

        const s = get(); // store
        const letters = s.letters; const digraphs = s.digraphs;

        const stem = (w: string) => w.replace(/(ing|ed|es|s)$/i, "");
        const featureCount = new Map<string, number>();
        const seenStem = new Set<string>();

        // score candidates
        const scored = baseWords.map(w => {
          const lower = w.toLowerCase();
          const chars = lower.split("");
          let worst = 0;
          for (let i = 0; i < chars.length; i++) {
            const ch = chars[i];
            const l = letters[ch];
            const acc = l ? (l.acc.a / Math.max(1, l.acc.a + l.acc.b)) : 0.9;
            const latMean = l ? l.lat.mean : 140;
            const latTerm = Math.min(1, latMean / 210);
            let diWeak = 0;
            if (i > 0) {
              const dk = chars[i - 1] + ch;
              const d = digraphs[dk];
              if (d) {
                const dacc = d.acc.a / Math.max(1, d.acc.a + d.acc.b);
                const dlat = Math.min(1, d.lat.mean / 230);
                diWeak = (1 - dacc) * 0.75 + dlat * 0.25;
              }
            }
            const diff = (1 - acc) * 0.7 + latTerm * 0.3;
            worst = Math.max(worst, (diff * 0.75 + diWeak * 0.25));
          }
          return { w: lower, s: worst };
        });

        scored.sort((a, b) => b.s - a.s);

        // exploitation slice
        const exploitCount = Math.max(0, Math.floor(n * (1 - epsilon)));
        const exploreCount = Math.max(0, n - exploitCount);

        const chosen: string[] = [];

        // helper to check per-feature cap
        const violatesCap = (w: string) => {
          const chs = new Set<string>();
          const cs = w.split("");
          for (let i = 0; i < cs.length; i++) {
            chs.add(cs[i]);
            if (i) chs.add(cs[i - 1] + cs[i]);
          }
          for (const k of chs) {
            const c = (featureCount.get(k) ?? 0);
            if (c >= maxCap) return true;
          }
          return false;
        };

        const push = (w: string) => {
          if (!w) return false;
          if (violatesCap(w)) return false;
          const steme = stem(w);
          if (chosen.length < minUnique && seenStem.has(steme)) return false;

          // update counts
          const cs = w.split("");
          for (let i = 0; i < cs.length; i++) {
            const ltr = cs[i];
            featureCount.set(ltr, (featureCount.get(ltr) ?? 0) + 1);
            if (i) {
              const dig = cs[i - 1] + cs[i];
              featureCount.set(dig, (featureCount.get(dig) ?? 0) + 1);
            }
          }
          seenStem.add(steme);
          chosen.push(w);
          return true;
        };

        // pick exploit
        for (let i = 0; i < scored.length && chosen.length < exploitCount; i++) push(scored[i].w);

        // exploration: pass through baseWords in order, fill remaining
        for (let i = 0; i < baseWords.length && chosen.length < n; i++) push(baseWords[i].toLowerCase());

        return chosen.slice(0, n);
      },
    }),
    {
      name: "bk-ai-coach",
      storage: createJSONStorage(() => (typeof window !== "undefined" ? window.localStorage : undefined)),
      partialize: (s) => ({
        enabled: s.enabled,
        includeDigraphs: s.includeDigraphs,
        intensity: s.intensity,
        letters: s.letters,
        digraphs: s.digraphs,
      }),
    }
  )
);


