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
    // Try Firebase auth first (for existing users)
    const authHeader = req.headers.get("authorization");
    const decoded = await verifyIdTokenFromAuthHeader(authHeader);
    const firebaseUid = decoded?.uid ?? null;
    
    // Try app auth if Firebase auth failed
    const appUser = !firebaseUid ? await getCurrentAppUser(req) : null;
    
    // Determine user identity
    let userDocId: string | null = null;
    let username: string | null = null;
    
    if (firebaseUid) {
      userDocId = firebaseUid;
      if (process.env.NODE_ENV !== "production") {
        console.log("[/api/runs] Firebase uid", firebaseUid);
      }
    } else if (appUser?.username) {
      username = appUser.username;
      userDocId = leaderboardDocId({ uid: null, username });
      if (process.env.NODE_ENV !== "production") {
        console.log("[/api/runs] App user", username, "-> docId", userDocId);
      }
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
    const { mode, durationSec, wordsCount, wpm, accuracy, guestId, clientRunId } = body || {};

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

    const runData: Record<string, any> = {
      uid: firebaseUid ?? null,
      userId: userDocId ?? null,
      username: username ?? null,
      guestId: userDocId ? null : (guestId ?? null),
      createdAt: serverTs(),
      mode: String(mode ?? "unknown"),
      durationSec: Number(durationSec ?? 0),
      wordsCount: Number.isFinite(Number(wordsCount)) ? Number(wordsCount) : null,
      wpm: Number(wpm),
      accuracy: Number(accuracy),
    };

    // Idempotent write by deterministic run id
    const db = getAdminDb();
    let runRef = db.collection("runs_v1").doc(
      createHash("sha256")
        .update([userDocId || "guest", String(mode || "unknown"), Math.round(Number(durationSec) || 0), Math.round(Number(wpm) || 0), Math.round(Number(accuracy) || 0), String(clientRunId || "")].join("|"))
        .digest("hex")
        .slice(0, 24)
    );
    try {
      const exists = (await runRef.get()).exists;
      if (!exists) await runRef.set(runData, { merge: false });
    } catch (e: any) {
      console.error("[/api/runs] run write failed", { name: e?.name, code: e?.code, message: e?.message });
      return NextResponse.json({ error: "run_write_failed", detail: e?.message || String(e) }, { status: 500 });
    }

    if (userDocId) {
      try {
        const totalsRef = db.collection("user_totals_v1").doc(userDocId);
        const userRef = db.collection("users").doc(userDocId);
        await db.runTransaction(async (tx) => {
          const snap = await tx.get(totalsRef);
          const now = Date.now();
          const xpDelta = Math.max(10, Math.round(Number(wpm) * (Number(accuracy) / 100) / 5));
          
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
            ...(username && { 
              username: username, 
              usernameLower: username.toLowerCase() 
            }),
          }, { merge: true });
        });
      } catch (e: any) {
        console.error("[/api/runs] totals update failed", { name: e?.name, code: e?.code, message: e?.message });
      }
    }

    return NextResponse.json({ ok: true, id: runRef.id }, { status: 200 });
  } catch (err: any) {
    console.error("[/api/runs] fatal", { name: err?.name, code: err?.code, message: err?.message, stack: err?.stack });
    const msg = err?.message || "Server error";
    return NextResponse.json(
      { error: "runs_fatal", message: msg, code: err?.code, stack: process.env.NODE_ENV === "development" ? err?.stack : undefined },
      { status: 500 }
    );
  }
}
