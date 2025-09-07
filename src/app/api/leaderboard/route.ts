import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const db = getAdminDb();
    const { searchParams } = new URL(req.url);

    const limit = Math.min(Number(searchParams.get("limit") || "50"), 100);
    const q = (searchParams.get("q") || "").trim().toLowerCase();
    const meUsername = (searchParams.get("meUsername") || "").trim().toLowerCase();

    // Base query: top by xpTotal desc, then recent updates
    let query = db
      .collection("users")
      .orderBy("xpTotal", "desc")
      .orderBy("lastUpdated", "desc")
      .limit(limit);

    // Search by usernameLower (prefix)
    if (q) {
      query = db
        .collection("users")
        .where("usernameLower", ">=", q)
        .where("usernameLower", "<=", q + "\uf8ff")
        .orderBy("usernameLower") // single-field index
        .limit(limit);
    }

    const snap = await query.get();
    const rows = snap.docs
      .map((d) => {
        const v = d.data() || {};
        const name = typeof v.username === "string" ? v.username.trim() : "";
        if (!name) return null; // ← skip docs that never had a username
        return {
          id: d.id,
          username: name,
          xpTotal: Number(v.xpTotal ?? 0),
          xpToday: Number(v.xpToday ?? 0),
          lastUpdated: v.lastUpdated?.toDate?.()?.toISOString?.() ?? null,
          photoURL: v.photoURL ?? null,
        };
      })
      .filter(Boolean); // remove nulls

    // Optionally fetch the signed-in user by usernameLower (for "pinned self" use)
    let me: any = null;
    if (meUsername) {
      const meQ = await db
        .collection("users")
        .where("usernameLower", "==", meUsername)
        .limit(1)
        .get();

      const doc = meQ.docs[0];
      if (doc) {
        const v = doc.data() || {};
        const name = typeof v.username === "string" ? v.username.trim() : "";
        if (name) {
          me = {
            id: doc.id,
            username: name,
            xpTotal: Number(v.xpTotal ?? 0),
            xpToday: Number(v.xpToday ?? 0),
            lastUpdated: v.lastUpdated?.toDate?.()?.toISOString?.() ?? null,
            photoURL: v.photoURL ?? null,
          };
        }
      }
    }

    return NextResponse.json({ rows, me });
  } catch (err: any) {
    console.error("[leaderboard] error", err);
    // Always return JSON so the client's j.json() doesn't blow up.
    return NextResponse.json({ error: String(err?.message || err), rows: [], me: null }, { status: 500 });
  }
}