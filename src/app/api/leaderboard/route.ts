import { NextRequest, NextResponse } from "next/server";
import { API_BASE } from "@/lib/api";
import { slog } from "@/lib/log";

export const dynamic = "force-dynamic";
export const fetchCache = "default-no-store";

export async function GET(req: NextRequest) {
  const upstream = `${API_BASE}/leaderboard`;
  try {
    const res = await fetch(upstream, {
      headers: { cookie: req.headers.get("cookie") ?? "" },
      cache: "no-store",
    });

    if (res.ok) {
      const body = await res.text();
      const headers = new Headers({ "content-type": "application/json" });
      const setCookie = res.headers.get("set-cookie");
      if (setCookie) headers.set("set-cookie", setCookie);
      return new NextResponse(body, { status: 200, headers });
    }

    // Fallback: benign stub so UI always renders
    slog("leaderboard upstream error", res.status, await res.text());
    const stub = [
      { rank: 1, username: "alex", xp: 3200 },
      { rank: 2, username: "jordan", xp: 2900 },
      { rank: 3, username: "morgan", xp: 2400 },
    ];
    return NextResponse.json(stub, { status: 200 });
  } catch (err: any) {
    slog("leaderboard proxy failed", 500, String(err?.stack || err));
    const stub = [
      { rank: 1, username: "alex", xp: 3200 },
      { rank: 2, username: "jordan", xp: 2900 },
      { rank: 3, username: "morgan", xp: 2400 },
    ];
    return NextResponse.json(stub, { status: 200 });
  }
}


