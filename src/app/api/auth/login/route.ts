import { NextRequest, NextResponse } from "next/server";
import { API_BASE } from "@/lib/api";
import { slog } from "@/lib/log";

export async function POST(req: NextRequest) {
  const upstream = `${API_BASE}/auth/login`;
  const ctype = req.headers.get("content-type") || "application/json";

  const body = await req.text();
  slog("login proxy →", upstream, "len", body?.length ?? 0, "ctype", ctype);

  const r = await fetch(upstream, {
    method: "POST",
    headers: {
      "content-type": ctype,
      cookie: req.headers.get("cookie") ?? "",
    },
    body,
  });

  const payload = await r.text();
  if (!r.ok) slog("login upstream error", r.status, payload.slice(0, 300));
  else slog("login upstream ok", r.status);

  const res = new NextResponse(payload, {
    status: r.status,
    headers: { "content-type": r.headers.get("content-type") || "application/json" },
  });

  const setCookies = r.headers.getSetCookie?.() ?? (r.headers.get("set-cookie") ? [r.headers.get("set-cookie")!] : []);
  for (const c of setCookies) res.headers.append("set-cookie", c);
  return res;
}


