// src/lib/prompt/normalSampler.ts
import { PRNG } from "@/lib/prng";
import { StringLRU } from "@/lib/lru";
import { bucketize, Bucket } from "@/lib/wordbanks/buckets";

export type NormalSampleOpts = {
  bank: string[];
  prng: PRNG;
  lru: StringLRU;
  count: number;
  dist?: { easy: number; medium: number; hard: number }; // default 70/25/5
  avoidSameFirst?: boolean; // default true
};

function rnd<T>(arr: T[], prng: PRNG): T | null {
  if (!arr.length) return null;
  return arr[Math.floor(prng() * arr.length)];
}

export function sampleNormalWords(opts: NormalSampleOpts): string[] {
  const { bank, prng, lru, count } = opts;
  const dist = opts.dist ?? { easy: 70, medium: 25, hard: 5 };
  const filtered = bank.filter(w => !lru.has(w.toLowerCase()));
  const buckets = bucketize(filtered.length >= count ? filtered : bank);

  const target = {
    easy: Math.round((dist.easy / 100) * count),
    medium: Math.round((dist.medium / 100) * count),
  };
  const hard = Math.max(0, count - target.easy - target.medium);

  const result: string[] = [];
  const push = (w: string | null) => { if (w) { result.push(w); lru.push(w.toLowerCase()); } };
  const fill = (b: Bucket, n: number) => { for (let i = 0; i < n; i++) push(rnd(buckets[b], prng)); };

  fill("easy", target.easy);
  fill("medium", target.medium);
  fill("hard", hard);

  // Variety guard: no 3 identical starting letters in a row
  if (opts.avoidSameFirst !== false) {
    for (let i = 2; i < result.length; i++) {
      const a = result[i - 2]?.[0], b = result[i - 1]?.[0], c = result[i]?.[0];
      if (a && b && c && a === b && b === c) {
        const j = Math.floor(prng() * i);
        [result[i], result[j]] = [result[j], result[i]];
      }
    }
  }

  return result.filter(Boolean).slice(0, count);
}
