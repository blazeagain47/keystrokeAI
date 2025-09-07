import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const db = getAdminDb();
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim().toLowerCase();
    const limit = Math.min(Number(url.searchParams.get("limit") || 10), 25);
    if (!q) return NextResponse.json({ rows: [] }, { status: 200 });

    const upper = q + "\uf8ff";
    const snap = await db
      .collection("users_public_v1")
      .where("usernameLower", ">=", q)
      .where("usernameLower", "<", upper)
      .orderBy("usernameLower", "asc")
      .limit(limit)
      .get();

    const ids = snap.docs.map((d) => d.id);
    const totalsSnaps = await Promise.all(ids.map((id) => db.collection("user_totals_v1").doc(id).get()));

    const rows = ids.map((id, i) => {
      const pub = snap.docs[i].data() as any;
      const tot = totalsSnaps[i].data() as any;
      return {
        id,
        username: pub?.username || `user-${id.slice(0, 6)}`,
        avatarUrl: pub?.avatarUrl ?? null,
        xpTotal: Number(tot?.totalXP || 0),
        bestWpm: Number.isFinite(tot?.bestWpm) ? Number(tot.bestWpm) : null,
        streakDays: Number.isFinite(tot?.streakDays) ? Number(tot.streakDays) : null,
      };
    });

    return NextResponse.json({ rows }, { status: 200, headers: { "cache-control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ rows: [], error: "internal" }, { status: 500 });
  }
}


