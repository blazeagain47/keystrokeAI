import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, guestId, mode, durationSec, wordsCount, wpm, accuracy, correct, errors } = body || {};

    if (!Number.isFinite(wpm) || !Number.isFinite(accuracy) || !Number.isFinite(durationSec)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Create run document
    const runData: any = {
      userId: userId || null,
      guestId: userId ? null : (guestId || null),
      createdAt: serverTimestamp(),
      mode: String(mode || "unknown"),
      durationSec: Number(durationSec || 0),
      wordsCount: Number(wordsCount || 0) || null,
      wpm: Number(wpm),
      accuracy: Number(accuracy),
      correct: Number.isFinite(correct) ? Number(correct) : null,
      errors: Number.isFinite(errors) ? Number(errors) : null,
    };
    await addDoc(collection(db, "runs_v1"), runData);

    // Update simple aggregates for authenticated users only
    if (userId) {
      const totalsRef = doc(db, "user_totals_v1", String(userId));
      const snap = await getDoc(totalsRef);
      if (!snap.exists()) {
        await setDoc(totalsRef, {
          totalRuns: 1,
          totalXP: 0,
          bestWpm: Number(wpm),
          avgWpm: Number(wpm),
          avgAcc: Number(accuracy),
          totalTimeSec: Number(durationSec),
          lastActiveUTC: Date.now(),
          streakDays: 1,
        });
      } else {
        const prev = snap.data() as any;
        const totalRuns = Number(prev.totalRuns || 0) + 1;
        const totalTimeSec = Number(prev.totalTimeSec || 0) + Number(durationSec);
        const bestWpm = Math.max(Number(prev.bestWpm || 0), Number(wpm));
        const avgWpm = ((Number(prev.avgWpm || 0) * Number(prev.totalRuns || 0)) + Number(wpm)) / totalRuns;
        const avgAcc = ((Number(prev.avgAcc || 0) * Number(prev.totalRuns || 0)) + Number(accuracy)) / totalRuns;
        const todayUTC = new Date(); todayUTC.setUTCHours(0,0,0,0);
        const lastUTC = new Date(Number(prev.lastActiveUTC || Date.now())); lastUTC.setUTCHours(0,0,0,0);
        const yesterdayUTC = new Date(todayUTC); yesterdayUTC.setUTCDate(todayUTC.getUTCDate() - 1);
        const streakDays = (lastUTC.getTime() === todayUTC.getTime()) ? Number(prev.streakDays || 1)
          : (lastUTC.getTime() === yesterdayUTC.getTime()) ? Number(prev.streakDays || 0) + 1
          : 1;
        const xpDelta = Math.max(10, Math.round(Number(wpm) * (Number(accuracy) / 100) / 5));
        await updateDoc(totalsRef, {
          totalRuns,
          totalXP: increment(xpDelta),
          bestWpm,
          avgWpm,
          avgAcc,
          totalTimeSec,
          lastActiveUTC: Date.now(),
          streakDays,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("/api/runs POST error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


