// src/lib/perf.ts
export function mark(label: string) {
  try {
    if (typeof performance !== "undefined" && performance.mark) performance.mark(label);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { tl } = require("./timeline");
    tl(`perf:mark:${label}`);
  } catch {}
}
export function measure(from: string, to: string) {
  try {
    let ms: number | null = null;
    if (typeof performance !== "undefined" && performance.measure) {
      const m = performance.measure(`${from}->${to}`, from, to);
      // @ts-ignore
      ms = (m?.duration ?? null) || null;
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { tl } = require("./timeline");
    tl(`perf:measure:${from}->${to}`, { ms });
    return ms;
  } catch { return null; }
}


