import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getAdminDb } from "@/lib/firebaseAdmin";
import { getCurrentAppUsername, usernameLowerOf } from "@/lib/appSession";

export async function GET(req: NextRequest) {
  try {
    // Identity comes from the app session cookie — the same identity /api/runs
    // uses as the doc id for user_totals_v1 (usernameLower). Previously this
    // route looked up totals by Firebase anonymous UID, a different doc than
    // the one totals were actually written to for signed-in users.
    const username = await getCurrentAppUsername(req);
    if (!username) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const usernameLower = usernameLowerOf(username)!;

    const db = getAdminDb();
    const doc = await db.collection("user_totals_v1").doc(usernameLower).get();
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
