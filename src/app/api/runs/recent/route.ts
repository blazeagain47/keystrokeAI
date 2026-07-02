import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getAdminDb } from "@/lib/firebaseAdmin";
import { getCurrentAppUsername, usernameLowerOf } from "@/lib/appSession";

export async function GET(req: NextRequest) {
  try {
    // Identity comes from the app session cookie (same source of truth as
    // /api/runs, /api/stats/history) — not a Firebase ID token. Those used
    // to disagree, which meant this endpoint queried a different "user" than
    // the one runs were actually written under and silently returned empty.
    const username = await getCurrentAppUsername(req);
    if (!username) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const usernameLower = usernameLowerOf(username)!;

    const db = getAdminDb();

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") || 20), 50);

    // Single-field equality + in-app sort, mirroring /api/stats/history, so
    // this never depends on a composite Firestore index existing.
    const snap = await db
      .collection("runs_v1")
      .where("usernameLower", "==", usernameLower)
      .limit(Math.max(limit, 200))
      .get();

    const runs = snap.docs
      .map((d) => {
        const x = d.data() as any;
        return {
          id: d.id,
          createdAt: x.createdAt?.toMillis?.() ?? null,
          wpm: x.wpm ?? null,
          accuracy: x.accuracy ?? null,
          durationSec: x.durationSec ?? null,
          mode: x.mode ?? null,
        };
      })
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      .slice(0, limit);

    return NextResponse.json({ ok: true, runs }, { status: 200 });
  } catch (err: any) {
    console.error("[/api/runs/recent] error", err?.message);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
