import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getAdminDb, verifyIdTokenFromAuthHeader } from "@/lib/firebaseAdmin";
import { creditStreakIfNeeded } from "@/lib/streakServer";

export async function POST(req: NextRequest) {
  try {
    const decoded = await verifyIdTokenFromAuthHeader(req.headers.get("authorization"));
    if (!decoded?.uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const uid = decoded.uid;
    const db = getAdminDb();
    const totalsRef = db.collection("user_totals_v1").doc(uid);
    const result = await creditStreakIfNeeded(totalsRef);

    return NextResponse.json({ ok: true, result }, { status: 200, headers: { "cache-control": "no-store" } });
  } catch (e: any) {
    console.error("[/api/streak/ping] failed:", e?.message || e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}


