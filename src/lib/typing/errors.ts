export type KeyEvent = { key: string; isError?: boolean; prevKey?: string | null };

export function computeTopErrorTokens(
  events?: KeyEvent[] | null,
  fallback?: { bigrams?: Record<string, number>; keys?: Record<string, number> } | null,
  limit = 3
): string[] {
  if (!events && !fallback) return [];
  const counts: Record<string, number> = {};

  if (events && events.length) {
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      if (!e?.isError) continue;
      const token =
        (e.prevKey && e.key && (e.prevKey + e.key).trim().length ? `${e.prevKey}${e.key}` : e.key) || e.key;
      if (!token) continue;
      counts[token] = (counts[token] || 0) + 1;
    }
  } else if (fallback) {
    const { bigrams, keys } = fallback;
    const src = bigrams && Object.keys(bigrams).length ? bigrams : keys || {};
    Object.entries(src).forEach(([k, v]) => (counts[k] = (counts[k] || 0) + (v || 0)));
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k);
}


