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
    // New combined controller per attempt so timeout works on retries
    const combined = new AbortController();
    const timeout = setTimeout(() => combined.abort(), timeoutMs);
    // Forward user abort into combined
    if (signal) {
      signal.addEventListener("abort", () => combined.abort(), { once: true });
    }
    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: combined.signal,
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
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
