import { useEffect, useRef } from "react";
export type Sample = { dt: number; t0: number; t1: number };
export function useInputLatencyProbe(enabled: boolean, deps: unknown[]) {
  const t0Ref = useRef<number | null>(null);
  const samplesRef = useRef<Sample[]>([]);
  const droppedKeysRef = useRef(0);
  const paintsRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const onKey = () => {
      const t0 = performance.now();
      t0Ref.current = t0;
      requestAnimationFrame(() => {
        paintsRef.current += 1;
        queueMicrotask(() => {
          const t1 = performance.now();
          const t0v = t0Ref.current;
          if (t0v == null) { droppedKeysRef.current += 1; return; }
          samplesRef.current.push({ dt: t1 - t0v, t0: t0v, t1 });
          if (samplesRef.current.length > 1000) samplesRef.current.shift();
        });
      });
    };
    window.addEventListener("keydown", onKey as any, { passive: true } as any);
    return () => window.removeEventListener("keydown", onKey as any);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const xs = samplesRef.current;
    if (xs.length && xs.length % 100 === 0) {
      const last = xs.slice(-100).map(s => s.dt).sort((a,b)=>a-b);
      const pct = (p:number)=> last[Math.min(last.length-1, Math.floor(last.length*p))] ?? 0;
      const min = last[0] ?? 0, med = pct(0.5), p95 = pct(0.95), p99 = pct(0.99);
      const buckets = new Array(8).fill(0);
      for (const v of last) buckets[Math.min(7, Math.floor(v/4))]++;

      // eslint-disable-next-line no-console
      console.table({ min, median: med, p95, p99, buckets,
        dropped: droppedKeysRef.current, paints: paintsRef.current });
    }
  }, [enabled, ...deps]);

  return null;
}


