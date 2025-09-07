import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = getAdminDb();
    const col = await db.collection("user_totals_v1").limit(1).get();
    return NextResponse.json(
      {
        ok: true,
        projectId: process.env.FIREBASE_PROJECT_ID || "n/a",
        totalsCountSample: col.size,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        message: String(e?.message || e),
      },
      { status: 500 }
    );
  }
}


