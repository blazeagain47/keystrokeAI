import { NextRequest, NextResponse } from "next/server";
import { verifyIdTokenFromAuthHeader, adminDiag } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const decoded = await verifyIdTokenFromAuthHeader(req.headers.get("authorization"));
  return NextResponse.json({ ok: !!decoded, uid: decoded?.uid || null, aud: (decoded as any)?.aud || null, env: adminDiag() }, { status: 200 });
}


