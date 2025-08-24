import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { adminDb, serverTs, inc, verifyIdTokenFromAuthHeader, adminDiag } from "@/lib/firebaseAdmin";

type RunPayload = {
  mode?: string;
  durationSec?: number;
  wordsCount?: number | null;
  wpm?: number;
  accuracy?: number;
  guestId?: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const decoded = await verifyIdTokenFromAuthHeader(authHeader);
    const uid = decoded?.uid ?? null;
    if (process.env.NODE_ENV !== "production") {
      console.log("[/api/runs] uid", uid, "env", adminDiag());
    }

    const body = (await req.json().catch((e) => { throw new Error("invalid_json: " + String(e?.message || e)); })) as RunPayload;
    const { mode, durationSec, wordsCount, wpm, accuracy, guestId } = body || {};

    if (!Number.isFinite(wpm) || !Number.isFinite(accuracy) || !Number.isFinite(durationSec)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const runData: Record<string, any> = {
      uid: uid ?? null,
      userId: uid ?? null,
      guestId: uid ? null : (guestId ?? null),
      createdAt: serverTs(),
      mode: String(mode ?? "unknown"),
      durationSec: Number(durationSec ?? 0),
      wordsCount: Number.isFinite(Number(wordsCount)) ? Number(wordsCount) : null,
      wpm: Number(wpm),
      accuracy: Number(accuracy),
    };

    let runRef;
    try {
      runRef = await adminDb.collection("runs_v1").add(runData);
    } catch (e: any) {
      console.error("[/api/runs] run write failed", { name: e?.name, code: e?.code, message: e?.message });
      return NextResponse.json({ error: "run_write_failed", detail: e?.message || String(e) }, { status: 500 });
    }

    if (uid) {
      try {
        const totalsRef = adminDb.collection("user_totals_v1").doc(uid);
        const snap = await totalsRef.get();
        const now = Date.now();
        if (!snap.exists) {
          await totalsRef.set({
            totalRuns: 1,
            totalXP: inc(Math.max(10, Math.round(Number(wpm) * (Number(accuracy) / 100) / 5))),
            bestWpm: Number(wpm),
            avgWpm: Number(wpm),
            avgAcc: Number(accuracy),
            totalTimeSec: Number(durationSec || 0),
            lastActiveUTC: now,
            streakDays: 1,
          }, { merge: true });
        } else {
          const prev = snap.data() as any;
          const prevRuns = Number(prev?.totalRuns || 0);
          const totalRuns = prevRuns + 1;
          const totalTimeSec = Number(prev?.totalTimeSec || 0) + Number(durationSec || 0);
          const bestWpm = Math.max(Number(prev?.bestWpm || 0), Number(wpm));
          const avgWpm = ((Number(prev?.avgWpm || 0) * prevRuns) + Number(wpm)) / totalRuns;
          const avgAcc = ((Number(prev?.avgAcc || 0) * prevRuns) + Number(accuracy)) / totalRuns;
          const xpDelta = Math.max(10, Math.round(Number(wpm) * (Number(accuracy) / 100) / 5));
          await totalsRef.set({
            totalRuns,
            totalXP: inc(xpDelta),
            bestWpm,
            avgWpm,
            avgAcc,
            totalTimeSec,
            lastActiveUTC: now,
            streakDays: ((): number => {
              const today = new Date(); today.setUTCHours(0,0,0,0);
              const lastUTC = new Date(Number(prev?.lastActiveUTC || now)); lastUTC.setUTCHours(0,0,0,0);
              const yesterdayUTC = new Date(today); yesterdayUTC.setUTCDate(today.getUTCDate() - 1);
              if (lastUTC.getTime() === today.getTime()) return Number(prev?.streakDays || 1);
              if (lastUTC.getTime() === yesterdayUTC.getTime()) return Number(prev?.streakDays || 0) + 1;
              return 1;
            })(),
          }, { merge: true });
        }
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
