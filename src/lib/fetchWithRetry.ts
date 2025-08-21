export type RetryOptions = {
  attempts?: number;         // default 3
  timeoutMs?: number;        // default 10000
  backoffMs?: number;        // default 600
  factor?: number;           // default 1.8
  fetchInit?: RequestInit;   // headers et al
};

export async function fetchWithRetry(url: string, opts: RetryOptions = {}) {
  const {
    attempts = 3,
    timeoutMs = 10000,
    backoffMs = 600,
    factor = 1.8,
    fetchInit = {},
  } = opts;

  let delay = backoffMs;
  let lastErr: any;

  for (let i = 0; i < attempts; i++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const externalSignal: AbortSignal | undefined = (fetchInit as any)?.signal;
    const onExternalAbort = externalSignal ? () => controller.abort() : undefined;
    if (externalSignal) {
      if (externalSignal.aborted) {
        clearTimeout(id);
        throw new DOMException('Aborted', 'AbortError');
      }
      externalSignal.addEventListener('abort', onExternalAbort as any);
    }

    try {
      const res = await fetch(url, { ...fetchInit, signal: controller.signal });
      clearTimeout(id);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      clearTimeout(id);
      lastErr = err;
      if (i < attempts - 1) {
        await new Promise(r => setTimeout(r, delay));
        delay = Math.round(delay * factor);
        continue;
      }
      throw lastErr;
    }
    finally {
      if (externalSignal && onExternalAbort) {
        externalSignal.removeEventListener('abort', onExternalAbort as any);
      }
    }
  }
  throw lastErr;
}


