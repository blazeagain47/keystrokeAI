import type { Firestore } from "firebase-admin/firestore";

export async function ensureUserTotalsDoc(
  db: Firestore,
  uid: string,
  opts?: { username?: string | null }
) {
  const ref = db.collection("user_totals_v1").doc(uid);
  const snap = await ref.get();

  if (!snap.exists) {
    await ref.set(
      {
        uid,
        username: opts?.username ?? null,
        totalXP: 0,
        totalRuns: 0,
        bestWpm: 0,
        streakDays: 0,
        totalTimeSec: 0,
        updatedAt: Date.now(),
        createdAt: Date.now(),
      },
      { merge: true }
    );
    return true;
  }

  if (!snap.get("username") && opts?.username) {
    await ref.set({ username: opts.username, updatedAt: Date.now() }, { merge: true });
  }

  return false;
}


