import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";

export async function GET(req: NextRequest) {
  try {
    // If you have auth cookies/session, resolve userId here. For now, client passes none → treat as guest.
    const userId = null as string | null;
    if (!userId) {
      return NextResponse.json({ guest: true });
    }

    const totalsRef = doc(db, "user_totals_v1", String(userId));
    const totalsSnap = await getDoc(totalsRef);
    const totals = totalsSnap.exists() ? totalsSnap.data() : null;

    const runsQ = query(
      collection(db, "runs_v1"),
      where("userId", "==", String(userId)),
      orderBy("createdAt", "desc"),
      limit(10)
    );
    const runsSnap = await getDocs(runsQ);
    const runs = runsSnap.docs.map(d => d.data() as any);
    const recent = runs.slice(0, 5).filter(r => Number(r.wpm) > 0 && Number(r.accuracy) > 0);
    const avg = (arr: number[]) => (arr.length ? Math.round(arr.reduce((a,b)=>a+b,0) / arr.length) : null);
    const recentAvgWpm = avg(recent.map(r => Number(r.wpm)));
    const recentAvgAcc = avg(recent.map(r => Math.round(Number(r.accuracy))));

    return NextResponse.json({ totals, recent: { wpm: recentAvgWpm, acc: recentAvgAcc, sampleCount: recent.length } });
  } catch (err: any) {
    return NextResponse.json({ guest: true }, { status: 200 });
  }
}


