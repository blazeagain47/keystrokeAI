import { NextRequest, NextResponse } from "next/server";
import { API_BASE } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const r = await fetch(`${API_BASE}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    const text = await r.text();
    return new NextResponse(text, {
      status: r.status,
      headers: { "Content-Type": r.headers.get("content-type") || "application/json" },
    });
  } catch (e: any) {
    return NextResponse.json({ error: "proxy_failed", detail: String(e), apiBase: API_BASE }, { status: 502 });
  }
}


