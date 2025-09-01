export type RNG = () => number;

/** xorshift32 — tiny, fast, deterministic */
export function makeRng(seed: number): RNG {
  let x = (seed | 0) || 123456789;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return ((x >>> 0) / 4294967296);
  };
}

/** Fisher–Yates shuffle in-place using supplied RNG */
export function shuffleInPlace<T>(arr: T[], rng: RNG) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/** Sample k items without replacement (shuffled slice). */
export function sampleK<T>(arr: T[], k: number, rng: RNG): T[] {
  const a = arr.slice();
  shuffleInPlace(a, rng);
  return a.slice(0, Math.max(0, Math.min(k, a.length)));
}

/** Simple string hash -> 32-bit int */
export function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}


