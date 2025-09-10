import { NextResponse } from "next/server";
import { API_BASE } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    API_BASE,
    nodeEnv: process.env.NODE_ENV,
    vercel: !!process.env.VERCEL,
  });
}
