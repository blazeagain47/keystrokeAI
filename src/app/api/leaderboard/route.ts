import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, adminDb, adminAuth } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Build a public leaderboard from Firestore totals using Admin SDK.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 25), 100);

  // Primary: Firestore totals → username via Admin Auth
  try {
    const snap = await adminDb
      .collection("user_totals_v1")
      .orderBy("totalXP", "desc")
      .limit(limit)
      .get();

    const docs = snap.docs;
    const rows = await Promise.all(
      docs.map(async (d) => {
        const uid = d.id;
        const data = d.data() as any;
        let username: string | null = data?.username ?? null;
        if (!username) {
          try {
            const u = await adminAuth.getUser(uid);
            username = u.displayName || (u.email ? u.email.split("@")[0] : null);
          } catch {}
        }
        const fallback = uid?.length > 6 ? `${uid.slice(0,4)}…${uid.slice(-2)}` : uid;
        return {
          id: uid,
          username: username || fallback || "player",
          xpTotal: Number(data?.totalXP || 0),
          bestWpm: Number.isFinite(data?.bestWpm) ? Number(data.bestWpm) : null,
          streakDays: Number.isFinite(data?.streakDays) ? Number(data.streakDays) : null,
        };
      })
    );

    return NextResponse.json({ rows }, { status: 200, headers: { "cache-control": "no-store" } });
  } catch (e) {
    // fall through to proxy / stub
  }

  const upstream = `${(process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/,"")}/leaderboard?limit=${encodeURIComponent(String(limit))}`;
  try {
    if (upstream.includes("http")) {
      const res = await fetch(upstream, {
        method: "GET",
        headers: { cookie: req.headers.get("cookie") ?? "" },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        return NextResponse.json(data, { status: 200, headers: { "cache-control": "no-store" } });
      }
    }
  } catch {}

  const rows = [
    { id: "1", username: "alex", xpTotal: 3200 },
    { id: "2", username: "jordan", xpTotal: 2900 },
    { id: "3", username: "morgan", xpTotal: 2400 },
  ];
  return NextResponse.json({ rows }, { status: 200, headers: { "cache-control": "no-store" } });
}


