// src/lib/sync.ts
import { startRetryDriver } from "./retryQueue";

let stop: null | (() => void) = null;
export function bootSync() {
  if (stop) return;
  try {
    stop = startRetryDriver() || null;
  } catch {}
}


