// src/lib/wordbanks/buckets.ts
export type Bucket = "easy" | "medium" | "hard";

export function classifyWord(w: string): Bucket {
  const s = w.toLowerCase();
  const len = s.length;
  const rare = /[jqxz]/.test(s) ? 1 : 0;
  if (len <= 4 && rare === 0) return "easy";
  if (len <= 7 && rare <= 1)  return "medium";
  return "hard";
}

export function bucketize(words: string[]) {
  const out: Record<Bucket, string[]> = { easy: [], medium: [], hard: [] };
  for (const w of words) out[classifyWord(w)].push(w);
  return out;
}
