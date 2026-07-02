import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { getCurrentAppUsername, usernameLowerOf } from "@/lib/appSession";

export const dynamic = "force-dynamic";
export const fetchCache = "default-no-store";

// Previously proxied to a Python backend route (`${API_BASE}/stats/summary`)
// that was never implemented — it always silently fell back to `{detail:
// "fallback"}`. Serves the same data /api/totals/me already computes from
// Firestore, keyed by the app session, so it now actually returns real xp.
export async function GET(req: NextRequest) {
  try {
    const username = await getCurrentAppUsername(req);
    if (!username) {
      return NextResponse.json({ totalXP: 0 }, { status: 200, headers: { "cache-control": "no-store" } });
    }
    const usernameLower = usernameLowerOf(username)!;

    const db = getAdminDb();
    const doc = await db.collection("user_totals_v1").doc(usernameLower).get();
    const x = doc.exists ? (doc.data() as any) : null;

    return NextResponse.json(
      { totalXP: Number(x?.totalXP ?? 0) || 0 },
      { status: 200, headers: { "cache-control": "no-store" } }
    );
  } catch (err: any) {
    console.error("[/api/stats/summary] error", err?.message);
    return NextResponse.json({ totalXP: 0 }, { status: 200, headers: { "cache-control": "no-store" } });
  }
}
