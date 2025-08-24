import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Build a public leaderboard from Firestore totals using Admin SDK.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 10), 1), 50);

    const db = getAdminDb();
    const snap = await db
      .collection("user_totals_v1")
      .orderBy("totalXP", "desc")
      .limit(limit)
      .get();

    const rows = snap.docs.map((d) => {
      const data = d.data() as any;
      const id = d.id;
      const xp = Number(data?.totalXP || 0);
      const username = (data?.username && String(data.username)) || `${id.slice(0, 6)}…`;
      return { id, username, xpTotal: xp };
    });

    return NextResponse.json({ rows }, { headers: { "cache-control": "no-store" } });
  } catch (e: any) {
    console.error("[api/leaderboard] failed:", e);
    return NextResponse.json({ rows: [], error: "internal" }, { status: 500 });
  }
}


