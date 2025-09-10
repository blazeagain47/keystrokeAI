import { NextRequest, NextResponse } from "next/server";
import { verifyIdTokenFromAuthHeader, adminDiag } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const decoded = await verifyIdTokenFromAuthHeader(req.headers.get("authorization"));
  // Only expose env diagnostics during local/dev probes
  const showDiag = process.env.NEXT_PUBLIC_DEV_PROBE === "1";
  const env = showDiag ? adminDiag() : null;
  return NextResponse.json(
    { ok: !!decoded, uid: decoded?.uid ?? null, aud: (decoded as any)?.aud ?? null, env },
    { status: 200 }
  );
}


