import { NextRequest, NextResponse } from "next/server";
import type { GenerateIn } from "@/server/generatePrompt";
import { generatePrompt } from "@/server/generatePrompt";

// Ensure Node runtime (avoid any edge/crypto fetch quirks)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "default-no-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const input = body as GenerateIn;

    const out = await generatePrompt(input);
    return NextResponse.json(out, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "GENERATION_FAILED", detail: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}


