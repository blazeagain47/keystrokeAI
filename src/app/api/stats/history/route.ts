import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "default-no-store";

import { getAdminDb } from "@/lib/firebaseAdmin";
import { getCurrentAppUsername } from "@/lib/appSession";

// Cap how many docs we ever pull per request — generous for "all time" stats
// without risking an unbounded read if a user has thousands of runs.
const MAX_RUNS = 1000;

export async function GET(req: NextRequest) {
  // No session -> no server-side history to merge; the client still has its
  // own local cache, so this is a safe, silent no-op rather than an error.
  const username = await getCurrentAppUsername(req);
  if (!username) {
    return NextResponse.json([], { status: 200, headers: { "cache-control": "no-store" } });
  }
  const usernameLower = username.trim().toLowerCase();

  try {
    const db = getAdminDb();
    // Runs are written with `usernameLower` already set (see /api/runs), so
    // this is a plain single-field equality query — no composite index
    // required, which keeps this resilient even on a fresh Firestore project.
    const snap = await db
      .collection("runs_v1")
      .where("usernameLower", "==", usernameLower)
      .limit(MAX_RUNS)
      .get();

    const runs = snap.docs
      .map((d) => {
        const x = d.data() as Record<string, any>;
        return {
          id: d.id,
          ts: x.createdAt?.toMillis?.() ?? null,
          wpm: typeof x.wpm === "number" ? x.wpm : null,
          acc: typeof x.accuracy === "number" ? x.accuracy : null,
          durationSec: typeof x.durationSec === "number" ? x.durationSec : null,
          mode: typeof x.mode === "string" ? x.mode : null,
          words: typeof x.wordsCount === "number" ? x.wordsCount : null,
          xpDelta: typeof x.xpDelta === "number" ? x.xpDelta : null,
        };
      })
      // Sort newest-first in-app rather than via Firestore orderBy, so we
      // never depend on a composite index existing for this query shape.
      .sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0));

    return NextResponse.json(runs, { status: 200, headers: { "cache-control": "no-store" } });
  } catch (err: any) {
    // Server truth is unavailable (e.g. Firestore misconfigured) — log loudly
    // so this is diagnosable, but degrade gracefully: the client still has
    // its own local history and will keep working with that.
    console.error("[/api/stats/history] firestore read failed:", err?.message || err);
    return NextResponse.json([], { status: 200, headers: { "cache-control": "no-store" } });
  }
}
