// src/app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { API_BASE } from "@/lib/api";

function expireCookie(path: string) {
  // Host-only cookie (no Domain), match by name + path; clear immediately.
  return [
    "ks_session=;",
    `Path=${path}`,
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  ].join("; ");
}

export async function POST() {
  // Tell upstream (best-effort) but never block UI
  try {
    await fetch(`${API_BASE}/auth/logout`, { method: "POST", cache: "no-store" }).catch(() => {});
  } catch {}

  // Build response and clear the cookie for common paths
  const res = NextResponse.json({ ok: true }, { status: 200 });
  res.headers.append("Set-Cookie", expireCookie("/"));
  res.headers.append("Set-Cookie", expireCookie("/api"));
  // In dev you may uncomment the next line once if you want a sledgehammer reset:
  // res.headers.append("Clear-Site-Data", '"cookies"');
  return res;
}
// src/app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { API_BASE } from "@/lib/api";

/**
 * Clears the ks_session cookie and (best-effort) notifies the backend logout endpoint.
 * Always returns 200 to keep UX snappy.
 */
export async function POST() {
  // Best-effort upstream logout (don't throw if backend doesn't implement it)
  try {
    await fetch(`${API_BASE}/auth/logout`, { method: "POST", cache: "no-store" }).catch(() => {});
  } catch {/* noop */}

  // Build response and clear cookie
  const res = NextResponse.json({ ok: true });
  res.headers.set("cache-control", "no-store");
  res.cookies.set("ks_session", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
  return res;
}

// Ensure no static caches are used for this handler in dev
export const dynamic = "force-dynamic";


