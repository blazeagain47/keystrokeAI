import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getAdminDb } from "@/lib/firebaseAdmin";
import { ensureUserTotalsDoc } from "@/lib/ensureTotals";
import { creditStreakIfNeeded } from "@/lib/streakServer";
import { getCurrentAppUsername, usernameLowerOf } from "@/lib/appSession";

export async function POST(req: NextRequest) {
  try {
    // Identity comes from the app session cookie, matching the doc id
    // /api/runs uses for user_totals_v1 (usernameLower). This used to key
    // off a Firebase anonymous UID, which silently credited streaks to a
    // throwaway identity instead of the user's real account.
    const username = await getCurrentAppUsername(req);
    if (!username) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const usernameLower = usernameLowerOf(username)!;

    const db = getAdminDb();
    // Ensure a totals doc exists for brand-new users (before first run)
    try { await ensureUserTotalsDoc(db, usernameLower, { username }); } catch {}
    const totalsRef = db.collection("user_totals_v1").doc(usernameLower);
    const result = await creditStreakIfNeeded(totalsRef);

    return NextResponse.json({ ok: true, result }, { status: 200, headers: { "cache-control": "no-store" } });
  } catch (e: any) {
    console.error("[/api/streak/ping] failed:", e?.message || e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
