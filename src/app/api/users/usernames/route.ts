import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getAdminDb } from "@/lib/firebaseAdmin";

/**
 * GET /api/users/usernames?ids=uid1,uid2,...
 * Looks up public usernames for a list of uids.
 * Expects a collection "users_public_v1" with docs keyed by uid:
 *   { username: string, displayName?: string, avatarUrl?: string }
 * Returns: { map: { [uid]: { username: string, avatarUrl?: string } } }
 */
export async function GET(req: NextRequest) {
  const idsParam = new URL(req.url).searchParams.get("ids") || "";
  const ids = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 100);

  if (ids.length === 0) {
    return NextResponse.json({ map: {} }, { status: 200 });
  }

  try {
    const db = getAdminDb();
    const refs = ids.map((id) => db.collection("users_public_v1").doc(id));
    const snaps = await db.getAll(...refs);

    const map: Record<string, { username: string; avatarUrl?: string | null }> = {};
    snaps.forEach((snap, i) => {
      const id = ids[i];
      if (!snap.exists) return;
      const x = snap.data() as any;
      const username =
        x?.username || x?.handle || x?.displayName || x?.name || `user-${id.slice(0, 6)}`;
      map[id] = { username, avatarUrl: x?.avatarUrl ?? null };
    });

    return NextResponse.json({ map }, { status: 200, headers: { "cache-control": "no-store" } });
  } catch (e: any) {
    // Soft fallback: return masked ids so UI can still render
    const map: Record<string, { username: string }> = {};
    for (const id of ids) map[id] = { username: `user-${id.slice(0, 6)}` };
    return NextResponse.json({ map, fallback: true }, { status: 200 });
  }
}


