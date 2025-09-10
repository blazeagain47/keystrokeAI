const FALLBACK = "http://127.0.0.1:8000";

function normalize(u?: string | null) {
  return u ? u.replace(/\/+$/, "") : u;
}

/**
 * Resolved API base:
 * - Prefers NEXT_PUBLIC_API_URL
 * - Trims trailing slashes
 * - In production, throws if unset or points to localhost/127.0.0.1
 */
export const API_BASE: string = (() => {
  const fromEnv = normalize(process.env.NEXT_PUBLIC_API_URL);
  const val = fromEnv || FALLBACK;

  const isProd = process.env.NODE_ENV === "production";
  const isLocal =
    /(^|\/)\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/i.test(val);

  if (isProd && (!fromEnv || isLocal)) {
    // Throw during route execution (will show up clearly in logs)
    throw new Error(
      `API_BASE misconfigured in production. Set NEXT_PUBLIC_API_URL to your upstream base (e.g. https://api.blazekeyapp.com). Current: "${val}".`
    );
  }
  return val;
})();

export function withBase(path: string) {
  if (!path.startsWith("/")) path = `/${path}`;
  return `${API_BASE}${path}`;
}

// Generic JSON fetcher (unchanged)
export type FetchJSONOptions = {
  method?: "GET" | "POST";
  body?: any;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  signal?: AbortSignal;
  headers?: Record<string, string>;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchJSON<T = any>(
  url: string,
  {
    method = "GET",
    body,
    timeoutMs = 10000,
    retries = 1,
    retryDelayMs = 600,
    signal,
    headers = {},
  }: FetchJSONOptions = {}
): Promise<T> {
  const attempt = async () => {
    const combined = new AbortController();
    const timeout = setTimeout(() => combined.abort(), timeoutMs);
    if (signal) signal.addEventListener("abort", () => combined.abort(), { once: true });
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...headers },
        body: body ? JSON.stringify(body) : undefined,
        signal: combined.signal,
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  };

  let lastErr: any;
  for (let i = 0; i <= retries; i++) {
    try {
      return await attempt();
    } catch (e) {
      lastErr = e;
      if (i < retries) await sleep(retryDelayMs * (i + 1));
    }
  }
  throw lastErr;
}
