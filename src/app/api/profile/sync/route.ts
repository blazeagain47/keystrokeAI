import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, verifyIdTokenFromAuthHeader } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Upsert public username so the leaderboard can display nice labels.
// Safe to call repeatedly; merges username into both `public_users_v1` and `user_totals_v1`.
export async function POST(req: NextRequest) {
  try {
    const authz = req.headers.get("authorization") || "";
    const decoded = await verifyIdTokenFromAuthHeader(authz);
    const uid = decoded?.uid;
    if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const username = typeof (body as any)?.username === "string" ? (body as any).username.trim() : "";

    if (!username) return NextResponse.json({ ok: true }); // no-op

    const db = getAdminDb();
    const lower = username.toLowerCase();

    await Promise.all([
      db.collection("public_users_v1").doc(uid).set(
        { username, usernameLower: lower, updatedAt: Date.now() },
        { merge: true }
      ),
      db.collection("user_totals_v1").doc(uid).set(
        { username, usernameLower: lower, updatedAt: Date.now() },
        { merge: true }
      ),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[api/profile/sync] failed:", e);
    return NextResponse.json({ ok: false, error: "internal" }, { status: 500 });
  }
}


