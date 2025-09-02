import { mulberry32, randomSeed } from "@/lib/prng";
import { getWordset } from "@/lib/wordbanks";
import { sanitizePrompt } from "@/lib/prompt/sanitize";

export type NoRepeatOpts = {
  max?: number;
  hardCap?: number;
  seed?: number;
  wordsetKey?: "core200" | "core1000" | "core5000";
  allowPunctuation?: boolean;
  allowNumbers?: boolean;
};

/**
 * Enforce per-word max occurrences within a prompt array while preserving length.
 * Uses a seeded shuffle-bag to fill overflow “holes” and avoid visible clumps.
 */
export function enforceNoRepeat(words: string[], opts: NoRepeatOpts = {}): string[] {
  const max = Math.max(1, opts.max ?? 2);
  const hardCap = Math.max(max, opts.hardCap ?? 3);
  const seed = (opts.seed ?? randomSeed()) >>> 0;

  const allowPunctuation = !!opts.allowPunctuation;
  const allowNumbers = !!opts.allowNumbers;

  const key = (w: string) => String(w || "").toLowerCase();

  const result = words.slice();
  const count = new Map<string, number>();
  const holes: number[] = [];

  for (let i = 0; i < result.length; i++) {
    const k = key(result[i]);
    const c = (count.get(k) ?? 0) + 1;
    count.set(k, c);
    if (c > max) holes.push(i);
  }

  if (!holes.length) {
    devAssert(count, max, hardCap);
    return result;
  }

  const bank = getWordset(opts.wordsetKey ?? "core5000");
  const isAllowed = (w: string) => {
    const s = sanitizePrompt(w, { allowPunctuation, allowNumbers });
    return !!s && s.indexOf(" ") === -1;
  };

  const uniqueFromSrc = Array.from(new Set(words.map(key)));
  const candidatesBase = Array.from(new Set<string>([...bank, ...uniqueFromSrc]).values()).filter(isAllowed);

  const prng = mulberry32(seed);

  const buildBag = (limit: number) => {
    const bag: string[] = [];
    for (const w of candidatesBase) {
      const k = key(w);
      const remaining = Math.max(0, limit - (count.get(k) ?? 0));
      for (let i = 0; i < remaining; i++) bag.push(w);
    }
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(prng() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    return bag;
  };

  let bag = buildBag(max);

  for (const idx of holes) {
    let picked: string | undefined;
    while (bag.length && !picked) {
      const w = bag.pop()!;
      const k = key(w);
      const c = (count.get(k) ?? 0);
      if (c < max) {
        picked = w;
        count.set(k, c + 1);
      }
    }
    if (!picked) {
      if (max < hardCap) {
        bag = buildBag(hardCap);
        while (bag.length && !picked) {
          const w = bag.pop()!;
          const k = key(w);
          const c = (count.get(k) ?? 0);
          if (c < hardCap) {
            picked = w;
            count.set(k, c + 1);
          }
        }
      }
      if (!picked) picked = result[idx];
    }
    result[idx] = picked!;
  }

  devAssert(count, max, hardCap);
  return result;
}

function devAssert(count: Map<string, number>, max: number, hardCap: number) {
  if (process.env.NODE_ENV !== "production") {
    let worst = 0;
    for (const c of count.values()) worst = Math.max(worst, c);
    console.assert(
      worst <= hardCap,
      "[NoRepeatLimiter] exceeded hardCap",
      { worst, hardCap, max }
    );
  }
}


