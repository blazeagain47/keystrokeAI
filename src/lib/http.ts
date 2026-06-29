// src/lib/http.ts
// Unified HTTP utility (Next.js 15) with:
// - JSON by default
// - Optional queue-on-fail for write methods (POST/PUT/PATCH/DELETE)
// - Single, clean set of exports (no duplicates)

// Re-export for other modules, while importing under internal aliases for local use.
import { withBase as _withBase, API_BASE as _API_BASE } from "@/lib/api";
import { enqueue } from "./retryQueue";

function isAbsoluteOrApi(path: string) {
  return (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("/api/")
  );
}

function buildUrl(input: string | Request): string | Request {
  if (typeof input !== "string") return input;
  return isAbsoluteOrApi(input) ? input : _withBase(input);
}

function shouldQueue(init: RequestInit) {
  const m = (init.method || "GET").toUpperCase();
  return m === "POST" || m === "PUT" || m === "PATCH" || m === "DELETE";
}

function parseBody(maybe: any) {
  if (!maybe) return undefined;
  if (typeof maybe === "string") {
    try { return JSON.parse(maybe); } catch { return maybe; }
  }
  return maybe;
}

/**
 * fetchJSON: JSON by default, with optional queue-on-fail.
 * - If `queueOnFail=true` and the request is a write (POST/PUT/PATCH/DELETE),
 *   we enqueue the request on HTTP failure or network error.
 */
export async function fetchJSON<T = any>(
  input: string | Request,
  init: (RequestInit & { queueOnFail?: boolean }) = {}
): Promise<T> {
  const url = buildUrl(input);

  // Merge headers and ensure content-type defaults to JSON.
  const mergedHeaders: Record<string, string> = {
    "content-type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };

  // If caller passed a plain object as body and content-type is JSON, stringify it.
  let bodyToSend: any = (init as any).body;
  const isJson = String(mergedHeaders["content-type"] || "").includes("application/json");
  if (bodyToSend && isJson && typeof bodyToSend !== "string" && !(bodyToSend instanceof Blob)) {
    try { bodyToSend = JSON.stringify(bodyToSend); } catch {}
  }

  try {
    const res = await fetch(url as any, {
      ...init,
      credentials: init.credentials ?? "include",
      headers: mergedHeaders,
      body: bodyToSend,
    });

    // Guard: if the API server returns an HTML error page (e.g. 502/504 from
    // a proxy), surface a clean message instead of raw HTML markup.
    let serviceDown = false;
    try {
      const ct = res.headers.get("content-type") ?? "";
      if (res.status >= 500 || ct.toLowerCase().startsWith("text/html")) {
        serviceDown = true;
      }
    } catch {}
    if (serviceDown) {
      throw new Error("Service is temporarily unavailable. Please try again.");
    }

    const text = await res.text().catch(() => "");

    if (!res.ok) {
      // On HTTP failure, queue if requested and method is a write.
      if (init.queueOnFail && shouldQueue(init)) {
        try {
          await enqueue({
            url: String(url),
            method: init.method ?? "GET",
            body: parseBody(bodyToSend),
            headers: mergedHeaders,
          });
        } catch {}
      }
      // Parse FastAPI-style { detail: "..." } errors into human-readable messages.
      let errorMessage = text || `http_${res.status}`;
      try {
        const parsed = JSON.parse(text);
        if (parsed?.detail && typeof parsed.detail === "string") {
          errorMessage = parsed.detail;
        }
      } catch {}
      throw new Error(errorMessage);
    }

    try { return (text ? JSON.parse(text) : {}) as T; }
    catch { return { _raw: text } as unknown as T; }
  } catch (err) {
    // On network error, also queue if requested and method is a write.
    if (init.queueOnFail && shouldQueue(init)) {
      try {
        await enqueue({
          url: String(url),
          method: init.method ?? "GET",
          body: parseBody(bodyToSend),
          headers: mergedHeaders,
        });
        // Return minimal object so callers that opted-in can continue.
        return {} as T;
      } catch {
        // fall through to rethrow
      }
    }
    throw err;
  }
}

// Convenience helper used by callers that just want an "ok/queued" result.
export async function postOrEnqueue<T = any>(
  url: string,
  body: unknown
): Promise<{ ok: boolean; queued?: boolean; data?: T }> {
  try {
    const data = await fetchJSON<T>(url, { method: "POST", body, queueOnFail: true });
    return { ok: true, data };
  } catch {
    // fetchJSON already enqueued on failure when queueOnFail=true
    return { ok: false, queued: true };
  }
}

// Single, final export of base helpers (no duplicates).
export { _API_BASE as API_BASE, _withBase as withBase };