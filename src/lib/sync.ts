// src/lib/sync.ts
let stop: null | (() => void) = null;
export function bootSync() {
  if (stop) return;
  try {
    const { startRetryDriver } = require("./retryQueue") as { startRetryDriver: () => (()=>void) | void };
    stop = startRetryDriver() || null;
  } catch {}
}


