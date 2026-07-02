// src/lib/retryQueue.ts

export type QueueItem = {
  id: string;
  url: string;
  method: string;
  body?: any;
  headers?: Record<string, string>;
  attempts?: number;
  nextAt?: number;
};

const KEY = "bk_retry_queue_v1";

let _idb: null | { get: (k: string) => Promise<any>; set: (k: string, v: any) => Promise<void> } = null;

async function ensureIDB() {
  if (_idb !== null) return _idb;
  if (typeof window === "undefined") return (_idb = null);
  try {
    const mod = await import("idb-keyval");
    _idb = { get: mod.get, set: mod.set };
  } catch {
    _idb = null;
  }
  return _idb;
}

async function load(): Promise<QueueItem[]> {
  const idb = await ensureIDB();
  if (idb) {
    try { return (await idb.get(KEY)) || []; } catch {}
  }
  try { return JSON.parse(localStorage.getItem(KEY) || "[]") as QueueItem[]; } catch { return []; }
}

async function save(items: QueueItem[]) {
  const idb = await ensureIDB();
  if (idb) {
    try { await idb.set(KEY, items); return; } catch {}
  }
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
}

export async function enqueue(item: Omit<QueueItem, "id" | "attempts" | "nextAt">) {
  const items = await load();
  const id = (globalThis.crypto?.randomUUID?.() ?? String(Date.now() + Math.random()));
  items.push({ ...item, id, attempts: 0, nextAt: Date.now() });
  await save(items);
  
  // Notify listeners of queue count change
  notifyQueueChange(items.length);
  
  return id;
}

/**
 * Flush the queue with exponential backoff (1s, 2s, 4s ... max 30s).
 * The processor should return true on success, false on retryable failure.
 */
// Simple event emitter for queue changes
const queueChangeListeners = new Set<(count: number) => void>();

function notifyQueueChange(count: number) {
  for (const listener of queueChangeListeners) {
    try { listener(count); } catch {}
  }
}

export function onQueueChange(cb: (count: number) => void): () => void {
  queueChangeListeners.add(cb);
  return () => queueChangeListeners.delete(cb);
}

export async function pendingCount(): Promise<number> {
  const items = await load();
  return items.length;
}

export async function flush(processor: (item: QueueItem) => Promise<boolean>) {
  const now = Date.now();
  const items = await load();
  const next: QueueItem[] = [];

  for (const it of items) {
    if ((it.nextAt ?? 0) > now) { next.push(it); continue; }
    const ok = await processor(it).catch(() => false);
    if (!ok) {
      const attempts = (it.attempts ?? 0) + 1;
      const backoffMs = Math.min(30000, 1000 * Math.pow(2, attempts - 1));
      next.push({ ...it, attempts, nextAt: Date.now() + backoffMs });
    }
  }

  await save(next);
  
  // Notify listeners of queue count change
  notifyQueueChange(next.length);
  
  return { remaining: next.length };
}

// Default processor: replays a queued request exactly as it was originally
// sent (method/url/body/headers), with cookies included so authenticated
// writes (e.g. saving a run) retry as the same user.
async function defaultProcessor(item: QueueItem): Promise<boolean> {
  try {
    const res = await fetch(item.url, {
      method: item.method,
      headers: { "content-type": "application/json", ...(item.headers || {}) },
      body: item.body !== undefined ? JSON.stringify(item.body) : undefined,
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

const FLUSH_INTERVAL_MS = 20000;

/**
 * Starts the background driver that actually retries queued requests:
 * once immediately, then on an interval, and whenever the browser comes
 * back online. Without this, enqueue() just accumulates items forever —
 * something has to call flush(). Returns a stop function.
 */
export function startRetryDriver(): () => void {
  if (typeof window === "undefined") return () => {};

  let stopped = false;
  const run = () => { if (!stopped) void flush(defaultProcessor); };

  run();
  const intervalId = window.setInterval(run, FLUSH_INTERVAL_MS);
  window.addEventListener("online", run);

  return () => {
    stopped = true;
    window.clearInterval(intervalId);
    window.removeEventListener("online", run);
  };
}


