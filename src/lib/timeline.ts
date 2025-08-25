// src/lib/timeline.ts
let t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
let seq = 0;
export function tl(label: string, data?: Record<string, any>) {
  const now = (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0;
  // Keep the log tiny and consistent
  // @ts-ignore
  try { console.log(`[TL ${(++seq).toString().padStart(3,"0")} @${now.toFixed(1)}ms] ${label}`, data ?? ""); } catch {}
}
export function tlReset() { t0 = typeof performance !== "undefined" ? performance.now() : Date.now(); seq = 0; }


