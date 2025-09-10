import { NextRequest, NextResponse } from "next/server";
import { API_BASE } from "@/lib/api";
import { slog } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "default-no-store";

export async function GET(req: NextRequest) {
  const upstream = `${API_BASE}/auth/me`;
  try {
    const res = await fetch(upstream, {
      method: "GET",
      headers: { cookie: req.headers.get("cookie") ?? "" },
      cache: "no-store",
    });

    const body = await res.text();
    if (!res.ok) {
      slog("me upstream error", res.status, body?.slice?.(0, 512));
      return new NextResponse(body || "", {
        status: res.status,
        headers: {
          "content-type": res.headers.get("content-type") || "text/plain",
          ...(res.headers.get("set-cookie")
            ? { "set-cookie": res.headers.get("set-cookie")! }
            : {}),
        },
      });
    }

    const headers = new Headers();
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) headers.set("set-cookie", setCookie);
    headers.set("content-type", "application/json");

    return new NextResponse(body, { status: 200, headers });
  } catch (err: any) {
    slog("me proxy failed", String(err?.stack || err));
    return NextResponse.json({ detail: "proxy_failed" }, { status: 500 });
  }
}
