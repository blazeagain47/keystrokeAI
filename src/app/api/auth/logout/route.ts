// src/app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { API_BASE } from "@/lib/api";

/** Build a Set-Cookie header that immediately expires the given cookie. */
function expireCookie(name: string, path = "/") {
  return [
    `${name}=;`,
    `Path=${path}`,
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  ].join("; ");
}

export async function POST() {
  // Best-effort upstream logout; never block UX on errors.
  try {
    await fetch(`${API_BASE}/auth/logout`, { method: "POST", cache: "no-store" }).catch(() => {});
  } catch {}

  // Clear session cookie on common paths and return 200.
  const cookieName = process.env.JWT_COOKIE_NAME || "ks_session";
  const res = NextResponse.json({ ok: true }, { status: 200 });
  res.headers.append("Set-Cookie", expireCookie(cookieName, "/"));
  res.headers.append("Set-Cookie", expireCookie(cookieName, "/api"));
  return res;
}


