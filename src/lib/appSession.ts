import { NextRequest } from "next/server";

/**
 * Resolves the signed-in app session (username/password backend) from the
 * forwarded cookie by calling our own /api/auth/me proxy. This is the single
 * source of truth for "who is this user" across all user-data API routes —
 * do not resolve identity from a Firebase ID token/anonymous UID instead,
 * that was a legacy parallel identity system that caused user data (totals,
 * recent runs, streaks) to be written under one identity and read under a
 * different one.
 */
export async function getCurrentAppUsername(req: NextRequest): Promise<string | null> {
  try {
    const meRes = await fetch(`${req.nextUrl.origin}/api/auth/me`, {
      headers: { cookie: req.headers.get("cookie") ?? "" },
      cache: "no-store",
    });
    if (!meRes.ok) return null;
    const data = await meRes.json();
    return data?.username ? String(data.username).trim() : null;
  } catch {
    return null;
  }
}

export function usernameLowerOf(username: string | null): string | null {
  return username ? username.trim().toLowerCase() : null;
}
