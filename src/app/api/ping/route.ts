import { NextResponse } from "next/server";
import { API_BASE } from "@/lib/api";

export async function GET() {
  try {
    const r = await fetch((`${API_BASE}/health`) as any).catch(() => null);
    return NextResponse.json({
      ok: !!r && r.ok,
      apiBase: API_BASE,
      status: r?.status ?? null,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, apiBase: API_BASE, error: String(e) }, { status: 500 });
  }
}


