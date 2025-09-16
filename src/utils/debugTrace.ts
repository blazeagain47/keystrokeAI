// utils/debugTrace.ts
export const trace = (() => {
  let seq = 0;
  return (label: string, data?: Record<string, unknown>) => {
    const t = (typeof performance !== 'undefined' && (performance as any).now)
      ? (performance as any).now().toFixed(3)
      : String(Date.now());
    // Keep log small and serializable
    const safe = data
      ? JSON.parse(
          JSON.stringify(data, (_k, v) => (typeof v === 'function' ? undefined : v))
        )
      : undefined;
    // eslint-disable-next-line no-console
    try { console.log(`[TRACE] #${++seq} @${t} ${label}`, safe ?? ''); } catch {}
  };
})();


