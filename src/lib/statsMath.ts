export const WORD_LEN = 5;

export function officialWpm(correctChars: number, durationMs: number) {
  if (durationMs <= 0) return 0;
  return (correctChars / WORD_LEN) / (durationMs / 60000);
}

export function rawWpm(allTypedChars: number, durationMs: number) {
  if (durationMs <= 0) return 0;
  return (allTypedChars / WORD_LEN) / (durationMs / 60000);
}

export function accuracy(correct: number, incorrect: number, missed: number, extra: number) {
  const total = correct + incorrect + missed + extra;
  return total > 0 ? (correct / total) * 100 : 0;
}

export function ema(series: number[], alpha = 0.3) {
  if (!series.length) return series;
  const out = new Array(series.length);
  let e = series[0];
  out[0] = e;
  for (let i = 1; i < series.length; i++) {
    e = alpha * series[i] + (1 - alpha) * e;
    out[i] = e;
  }
  return out;
}

export function dropFirstN<T>(series: T[], n = 1) {
  return series.slice(n);
}

export function stdev(values: number[]) {
  if (values.length < 2) return 0;
  const mean = values.reduce((a,b)=>a+b,0)/values.length;
  const v = values.reduce((a,b)=>a + Math.pow(b-mean,2),0)/(values.length-1);
  return Math.sqrt(v);
}

export type PerSecond = { t: number; wpm: number; acc?: number };

export function normalizePerSecond(input: Array<{ t: number; wpm: number }>): PerSecond[] {
  // Ensure strictly increasing t, coalesce duplicates by keeping last.
  const out: PerSecond[] = [];
  let lastT = -1;
  for (const s of input) {
    const t = Math.max(0, Math.floor(s.t));
    if (out.length && out[out.length-1].t === t) {
      out[out.length-1].wpm = s.wpm;
    } else if (t > lastT) {
      out.push({ t, wpm: s.wpm });
      lastT = t;
    }
  }
  return out;
}
