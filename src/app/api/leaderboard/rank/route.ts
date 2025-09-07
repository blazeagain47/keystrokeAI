import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, verifyIdTokenFromAuthHeader } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const db = getAdminDb();
    const { searchParams } = new URL(req.url);
    const explicitUid = searchParams.get("uid");
    let uid = explicitUid;

    if (!uid) {
      const decoded = await verifyIdTokenFromAuthHeader(req.headers.get("authorization"));
      if (!decoded?.uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      uid = decoded.uid;
    }

    const meDoc = await db.collection("user_totals_v1").doc(String(uid)).get();
    if (!meDoc.exists) return NextResponse.json({ rank: null, window: [] }, { status: 200 });

    const myXP = Number((meDoc.data() as any)?.totalXP || 0);

    // Count number of users strictly greater than my XP
    const higherSnap = await db.collection("user_totals_v1").where("totalXP", ">", myXP).get();
    const rank = higherSnap.size + 1;

    const aboveSnap = await db
      .collection("user_totals_v1")
      .where("totalXP", ">=", myXP)
      .orderBy("totalXP", "desc")
      .limit(3)
      .get();

    const belowSnap = await db
      .collection("user_totals_v1")
      .where("totalXP", "<", myXP)
      .orderBy("totalXP", "desc")
      .limit(3)
      .get();

    const rows = [...aboveSnap.docs, ...belowSnap.docs].map((d) => ({
      id: d.id,
      xpTotal: Number(d.get("totalXP") || 0),
      username: (d.get("username") || null),
    }));

    return NextResponse.json({ rank, window: rows }, { status: 200, headers: { "cache-control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}


