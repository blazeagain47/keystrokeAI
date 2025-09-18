import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getAdminDb, serverTs, verifyIdTokenFromAuthHeader } from "@/lib/firebaseAdmin";
import { leaderboardDocId } from "@/lib/leaderboardUser";
import * as admin from "firebase-admin";
import { createHash } from "crypto";

type RunPayload = {
  mode?: string;
  durationSec?: number;
  wordsCount?: number | null;
  wpm?: number;
  accuracy?: number;
  guestId?: string | null;
  clientRunId?: string;
};

// Helper to get current app user from session/cookies
async function getCurrentAppUser(req: NextRequest): Promise<{ username: string } | null> {
  try {
    // Forward cookies to the /api/auth/me endpoint
    const meRes = await fetch(`${req.nextUrl.origin}/api/auth/me`, {
      headers: { cookie: req.headers.get("cookie") ?? "" },
      cache: "no-store",
    });
    
    if (!meRes.ok) return null;
    const userData = await meRes.json();
    return userData?.username ? { username: userData.username } : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Resolve identities from headers and cookies
    const authHeader = req.headers.get("authorization");
    const decoded = await verifyIdTokenFromAuthHeader(authHeader);
    const firebaseUid = decoded?.uid ?? null;
    const signInProvider = (decoded as any)?.firebase?.sign_in_provider || null;
    const isAnonymous = signInProvider === "anonymous";

    const appUser = await getCurrentAppUser(req);

    // Prefer app session username when available; otherwise use non-anonymous Firebase uid
    let userDocId: string | null = null;
    let username: string | null = null;
    if (appUser?.username) {
      username = String(appUser.username).trim();
      try { userDocId = leaderboardDocId({ uid: null, username }); } catch { userDocId = username.toLowerCase(); }
      if (process.env.NODE_ENV !== "production") console.log("[/api/runs] Using app session:", username, "->", userDocId);
    } else if (firebaseUid && !isAnonymous) {
      userDocId = firebaseUid;
      if (process.env.NODE_ENV !== "production") console.log("[/api/runs] Using Firebase uid:", firebaseUid);
    } else {
      if (process.env.NODE_ENV !== "production") console.log("[/api/runs] Guest run (no session)");
    }
    
    if (process.env.NODE_ENV !== "production") {
      console.log("[/api/runs] Final userDocId:", userDocId);
    }

    let body: RunPayload | null = null;
    try {
      body = await req.json();
    } catch (e) {
      const errorMessage = String((e as any)?.message || e);
      console.warn("[/api/runs] invalid or empty JSON body", errorMessage);
      // Dev-friendly: avoid crashing overlay on aborted/empty bodies
      if (process.env.NODE_ENV !== "production") {
        return NextResponse.json({ ok: true, skipped: true });
      }
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }
    const { mode, durationSec, wordsCount, wpm, accuracy, guestId } = body || {};

    if (!Number.isFinite(wpm) || !Number.isFinite(accuracy) || !Number.isFinite(durationSec)) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    // Validation caps
    const MAX_WPM = 250;
    const MIN_DURATION = 10;
    const MAX_DURATION = 1200;
    if (Number(wpm) <= 0 || Number(wpm) > MAX_WPM) return NextResponse.json({ error: "wpm_out_of_range" }, { status: 422 });
    if (Number(accuracy) < 0 || Number(accuracy) > 100) return NextResponse.json({ error: "accuracy_out_of_range" }, { status: 422 });
    if (Number(durationSec) < MIN_DURATION || Number(durationSec) > MAX_DURATION) return NextResponse.json({ error: "duration_out_of_range" }, { status: 422 });

    // Compute xp safely
    let xpCalc = (Number(wpm) * (Number(accuracy) / 100)) / 5;
    if (!Number.isFinite(xpCalc) || xpCalc <= 0) xpCalc = 10;
    const xpDelta = Math.max(10, Math.round(xpCalc));

    // Resolve exact user doc by usernameLower when available
    let userRef: FirebaseFirestore.DocumentReference | null = null;
    const usernameLower = username ? String(username).toLowerCase() : null;
    if (usernameLower) {
      const q = await getAdminDb().collection("users").where("usernameLower", "==", usernameLower).limit(1).get();
      userRef = q.empty ? getAdminDb().collection("users").doc(usernameLower) : q.docs[0].ref;
    } else if (userDocId) {
      userRef = getAdminDb().collection("users").doc(userDocId);
    }

    const runData: Record<string, any> = {
      uid: firebaseUid ?? null,
      userId: userRef ? userRef.id : null,
      username: username ?? null,
      usernameLower: usernameLower ?? null,
      guestId: userRef ? null : (guestId ?? null),
      createdAt: serverTs(),
      mode: String(mode ?? "unknown"),
      durationSec: Number(durationSec ?? 0),
      wordsCount: Number.isFinite(Number(wordsCount)) ? Number(wordsCount) : null,
      wpm: Number(wpm),
      accuracy: Number(accuracy),
      xpDelta,
      xp: xpDelta,
    };

    // Idempotent write by deterministic run id
    const db = getAdminDb();
    const runRef = db.collection("runs_v1").doc();
    try {
      await runRef.set(runData, { merge: false });
    } catch (e: any) {
      console.error("[/api/runs] run write failed", { name: e?.name, code: e?.code, message: e?.message });
      return NextResponse.json({ error: "run_write_failed", detail: e?.message || String(e) }, { status: 500 });
    }

    if (userRef) {
      try {
        const totalsRef = db.collection("user_totals_v1").doc(userRef.id);
        await db.runTransaction(async (tx) => {
          const snap = await tx.get(totalsRef);
          const now = Date.now();
          
          // Update user_totals_v1 (existing logic)
          if (!snap.exists) {
            tx.set(totalsRef, {
              totalRuns: 1,
              totalXP: admin.firestore.FieldValue.increment(xpDelta),
              bestWpm: Number(wpm),
              avgWpm: Number(wpm),
              avgAcc: Number(accuracy),
              totalTimeSec: Number(durationSec || 0),
              lastActiveUTC: now,
              streakDays: 0,
              lastStreakUTC: null,
              streakModel: "login-utc@2025-08-24",
            }, { merge: true });
          } else {
            const prev = snap.data() as any;
            const prevRuns = Number(prev?.totalRuns || 0);
            const totalRuns = prevRuns + 1;
            const totalTimeSec = Number(prev?.totalTimeSec || 0) + Number(durationSec || 0);
            const bestWpm = Math.max(Number(prev?.bestWpm || 0), Number(wpm));
            const avgWpm = ((Number(prev?.avgWpm || 0) * prevRuns) + Number(wpm)) / totalRuns;
            const avgAcc = ((Number(prev?.avgAcc || 0) * prevRuns) + Number(accuracy)) / totalRuns;
            tx.set(totalsRef, {
              totalRuns,
              totalXP: admin.firestore.FieldValue.increment(xpDelta),
              bestWpm,
              avgWpm,
              avgAcc,
              totalTimeSec,
              lastActiveUTC: now,
            }, { merge: true });
          }

          // Also update users/{docId} for leaderboard consistency
          tx.set(userRef, {
            xpTotal: admin.firestore.FieldValue.increment(xpDelta),
            xpToday: admin.firestore.FieldValue.increment(xpDelta),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            // Keep username authoritative in case user renamed
            ...(usernameLower ? { username: username ?? usernameLower, usernameLower } : {}),
          }, { merge: true });
        });
      } catch (e: any) {
        console.error("[/api/runs] totals update failed", { name: e?.name, code: e?.code, message: e?.message });
      }
    }

    return NextResponse.json({ ok: true, id: runRef.id, xpDelta, username, usernameLower }, { status: 200 });
  } catch (err: any) {
    console.error("[/api/runs] fatal", { name: err?.name, code: err?.code, message: err?.message, stack: err?.stack });
    const msg = err?.message || "Server error";
    return NextResponse.json(
      { error: "runs_fatal", message: msg, code: err?.code, stack: process.env.NODE_ENV === "development" ? err?.stack : undefined },
      { status: 500 }
    );
  }
}
