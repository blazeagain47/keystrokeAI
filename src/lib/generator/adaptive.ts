import { type PRNG } from "@/lib/prng";
import { StringLRU } from "@/lib/lru";
import { useAICoach } from "@/store/aiCoach";

export interface AdaptiveOpts {
  count: number;
  poolSize: number;
  prng: PRNG;
  baseBank: string[];
  avoid?: StringLRU;
  allowNumbers?: boolean;
  allowPunct?: boolean;
  tierBlend?: { easy?: number; med?: number; hard?: number };
}

const LETTER_RE = /[a-z0-9]/;

function scoreWordByBeliefs(w: string): number {
  const st = useAICoach.getState();
  const letters = st.letters as Record<string, any>;
  const digraphs = st.digraphs as Record<string, any>;
  const chars = w.toLowerCase().split("").filter(c => LETTER_RE.test(c));
  if (!chars.length) return 0.001;

  let worst = 0;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const l = letters[ch];
    const acc = l ? (l.acc.a / Math.max(1, l.acc.a + l.acc.b)) : 0.9;
    const latMean = l ? l.lat.mean : 140;
    const latTerm = Math.min(1, (latMean / 210));
    const diff = (1 - acc) * 0.7 + latTerm * 0.3;

    let diWeak = 0;
    if (i > 0) {
      const dk = chars[i - 1] + ch;
      const d = digraphs[dk];
      if (d) {
        const dacc = (d.acc.a / Math.max(1, d.acc.a + d.acc.b));
        const dlat = Math.min(1, (d.lat.mean / 230));
        diWeak = (1 - dacc) * 0.75 + dlat * 0.25;
      }
    }
    worst = Math.max(worst, (diff * 0.75 + diWeak * 0.25));
  }
  return Math.pow(worst, 1.0);
}

function pickIndex(prng: PRNG, n: number) {
  return Math.floor(prng() * n);
}

export function sampleUnique(base: string[], n: number, prng: PRNG, avoid?: StringLRU): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  let guard = 0;
  while (out.length < n && guard < n * 20) {
    guard++;
    const w = base[pickIndex(prng, base.length)];
    if (!w) continue;
    const wl = w.toLowerCase();
    if (seen.has(wl)) continue;
    if (avoid?.has(wl)) continue;
    out.push(wl);
    seen.add(wl);
  }
  return out;
}

export function buildAdaptiveBatch(opts: AdaptiveOpts): string[] {
  const { count, poolSize, prng, baseBank, avoid } = opts;
  const pool = sampleUnique(baseBank, Math.max(count, poolSize), prng, avoid);
  const scored = pool.map(w => [w, scoreWordByBeliefs(w)] as const)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([w]) => w);
  scored.forEach(w => avoid?.push(w));
  return scored;
}


