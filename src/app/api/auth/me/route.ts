import { NextRequest, NextResponse } from "next/server";
import { API_BASE } from "@/lib/api";
import { slog } from "@/lib/log";

export async function GET(req: NextRequest) {
  const upstream = `${API_BASE}/auth/me`;
  const r = await fetch(upstream, {
    headers: {
      cookie: req.headers.get("cookie") ?? "",
    },
    cache: "no-store",
  });
  let text = await r.text();
  if (!r.ok) slog("me upstream error", r.status, text.slice(0, 300));

  const res = new NextResponse(text, {
    status: r.status,
    headers: { "content-type": r.headers.get("content-type") || "application/json" },
  });

  const setCookies = (r as any).headers.getSetCookie?.() ?? (r.headers.get("set-cookie") ? [r.headers.get("set-cookie")!] : []);
  for (const c of setCookies) res.headers.append("set-cookie", c);
  return res;
}


