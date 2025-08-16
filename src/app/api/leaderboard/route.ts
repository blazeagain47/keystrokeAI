import { NextRequest, NextResponse } from "next/server";
import { API_BASE } from "@/lib/api";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limit = url.searchParams.get("limit") || "10";

  const upstream = `${API_BASE.replace(/\/+$/,"")}/leaderboard?limit=${encodeURIComponent(limit)}`;

  try {
    const res = await fetch(upstream, {
      method: "GET",
      headers: { cookie: req.headers.get("cookie") ?? "" },
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(data, {
        status: 200,
        headers: { "cache-control": "no-store" },
      });
    }

    // Fall through to stub
  } catch {
    // Fall through to stub
  }

  // Stub fallback if backend endpoint is missing
  const rows = [
    { id: "1", username: "alex", xpTotal: 3200 },
    { id: "2", username: "jordan", xpTotal: 2900 },
    { id: "3", username: "morgan", xpTotal: 2400 },
  ];
  return NextResponse.json({ rows }, { status: 200, headers: { "cache-control": "no-store" } });
}


