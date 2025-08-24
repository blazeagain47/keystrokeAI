import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getAdminDb, verifyIdTokenFromAuthHeader } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  try {
    const decoded = await verifyIdTokenFromAuthHeader(req.headers.get("authorization"));
    if (!decoded?.uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const uid = decoded.uid;

    const db = getAdminDb();
    const doc = await db.collection("user_totals_v1").doc(uid).get();
    if (!doc.exists) return NextResponse.json({ ok: true, totals: null }, { status: 200 });

    const x = doc.data() as any;
    return NextResponse.json({
      ok: true,
      totals: {
        totalRuns: x.totalRuns ?? 0,
        totalXP: x.totalXP ?? 0,
        bestWpm: x.bestWpm ?? null,
        avgWpm: x.avgWpm ?? null,
        avgAcc: x.avgAcc ?? null,
        totalTimeSec: x.totalTimeSec ?? 0,
        lastActiveUTC: x.lastActiveUTC ?? null,
        lastStreakUTC: x.lastStreakUTC ?? null,
        streakDays: x.streakDays ?? 0,
      }
    }, { status: 200 });
  } catch (err: any) {
    console.error("[/api/totals/me] error", err?.message);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}


