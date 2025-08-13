// src/lib/http.ts
// Unified small HTTP utility used across the app.

import { withBase, API_BASE } from "@/lib/api";

function buildUrl(input: string): string {
  if (input.startsWith("http://") || input.startsWith("https://") || input.startsWith("/api/")) {
    return input;
  }
  return withBase(input);
}

export async function fetchJSON<T = any>(
  input: string | Request,
  init: RequestInit = {}
): Promise<T> {
  const url = typeof input === "string" ? buildUrl(input) : (input as Request);

  // Merge headers and ensure content-type defaults to JSON.
  const mergedHeaders: Record<string, string> = {
    "content-type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };

  // If caller passed a plain object as body and content-type is JSON, stringify it.
  let bodyToSend: any = (init as any).body;
  const isJson = String(mergedHeaders["content-type"] || "").includes("application/json");
  if (bodyToSend && isJson && typeof bodyToSend !== "string" && !(bodyToSend instanceof Blob)) {
    try {
      bodyToSend = JSON.stringify(bodyToSend);
    } catch {
      // fall through — let fetch throw if it can't handle it
    }
  }

  const res = await fetch(url as any, {
    ...init,
    credentials: init.credentials ?? "include",
    headers: mergedHeaders,
    body: bodyToSend,
  });

  const text = await res.text().catch(() => "");

  if (!res.ok) {
    throw new Error(text || `http_${res.status}`);
  }

  try {
    return (text ? JSON.parse(text) : {}) as T;
  } catch {
    return { _raw: text } as unknown as T;
  }
}

export { API_BASE, withBase } from "@/lib/api";


