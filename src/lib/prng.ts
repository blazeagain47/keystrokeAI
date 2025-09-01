export type PRNG = () => number;

// Mulberry32 — tiny, stable seed PRNG
export function mulberry32(seed: number): PRNG {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// convenient seed from crypto if available
export function randomSeed(): number {
  if (typeof crypto !== "undefined" && (crypto as any).getRandomValues) {
    const a = new Uint32Array(1);
    (crypto as any).getRandomValues(a);
    return a[0] || (Date.now() >>> 0);
  }
  return (Date.now() ^ ((Math.random() * 1e9) >>> 0)) >>> 0;
}


