import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { leaderboardDocId } from "@/lib/leaderboardUser";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { uid, username, photoURL } = body || {};
    const usernameClean = String(username || "").trim();

    if (!usernameClean) {
      return NextResponse.json({ error: "username required" }, { status: 400 });
    }

    const db = getAdminDb();
    const docId = leaderboardDocId({ uid: null, username: usernameClean });
    const usernameLower = usernameClean.toLowerCase();

    await db.collection("users").doc(docId).set(
      {
        // keep username fields authoritative for display + search
        username: usernameClean, 
        usernameLower,
        xpTotal: admin.firestore.FieldValue.increment(0), // initialize if absent
        xpToday: admin.firestore.FieldValue.increment(0),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        photoURL: photoURL ?? null,
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true, docId });
  } catch (err: any) {
    console.error("[profile/sync] error", err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}