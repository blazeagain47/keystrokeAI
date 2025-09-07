// Server-side proxy logger (small and safe)
// eslint-disable-next-line no-console
export function slog(...args: any[]) {
  const ts = new Date().toISOString();
  console.log(`[bk] ${ts}`, ...args);
}

// eslint-disable-next-line no-console
export function serr(...args: any[]) {
  const ts = new Date().toISOString();
  console.error(`[bk] ${ts}`, ...args);
}


