// Server-side proxy logger (small and safe)
// eslint-disable-next-line no-console
export function slog(...args: any[]) {
  console.log("[api-proxy]", ...args);
}


