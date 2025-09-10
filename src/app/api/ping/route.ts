import { NextResponse } from "next/server";
export const runtime = "nodejs";
export async function GET() {
  return NextResponse.json({ ok: true, local: true, ts: Date.now() });
}


