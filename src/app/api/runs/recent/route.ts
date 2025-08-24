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

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") || 20), 50);

    const snap = await db
      .collection("runs_v1")
      .where("uid", "==", uid)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const runs = snap.docs.map((d) => {
      const x = d.data() as any;
      return {
        id: d.id,
        createdAt: x.createdAt?.toMillis?.() ?? null,
        wpm: x.wpm ?? null,
        accuracy: x.accuracy ?? null,
        durationSec: x.durationSec ?? null,
        mode: x.mode ?? null,
      };
    });

    return NextResponse.json({ ok: true, runs }, { status: 200 });
  } catch (err: any) {
    console.error("[/api/runs/recent] error", err?.message);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}


