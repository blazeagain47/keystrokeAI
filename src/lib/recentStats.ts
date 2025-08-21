export type RunLike = {
  wpm?: number | null;
  accuracyPct?: number | null; // preferred
  accuracy?: number | null;    // tolerate
  acc?: number | null;         // tolerate
  durationSec?: number | null;
  completed?: boolean | null;
  isComplete?: boolean | null;
};

function pickAcc(r: RunLike): number | null {
  const v = r.accuracyPct ?? r.accuracy ?? (r as any).acc ?? null;
  return typeof v === 'number' && isFinite(v) ? v : null;
}

export function computeRecentAverages(
  history: RunLike[] | undefined,
  n: number = 5
): { avgWpm: number | null; avgAcc: number | null; sampleCount: number } {
  const items = (history ?? [])
    // include runs if explicitly completed OR there is usable metric data
    .filter(r => {
      const hasFlag = r.completed === true || r.isComplete === true;
      const hasMetrics =
        (typeof r.wpm === 'number' && isFinite(r.wpm)) ||
        (pickAcc(r) != null);
      return hasFlag || hasMetrics;
    })
    .map(r => {
      const w = typeof r.wpm === 'number' && isFinite(r.wpm) ? r.wpm : null;
      const a = pickAcc(r);
      return { w, a };
    })
    .filter(x => x.w != null || x.a != null)
    .slice(-n);

  if (items.length === 0) return { avgWpm: null, avgAcc: null, sampleCount: 0 };

  const wpmVals = items.map(x => x.w).filter((v): v is number => v != null);
  const accVals = items.map(x => x.a).filter((v): v is number => v != null);

  const avg = (arr: number[]) => (arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) : null);

  return { avgWpm: avg(wpmVals), avgAcc: avg(accVals), sampleCount: items.length };
}


