// Shared server-side streak logic (UTC-boundary, login-based).
import { firestore } from "firebase-admin";

export const DAY_MS = 24 * 60 * 60 * 1000;
export const STREAK_MODEL = "login-utc@2025-08-24";

export function startOfUTCDay(ts: number): number {
  const d = new Date(ts);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * creditStreakIfNeeded
 * - Canonical source: user_totals_v1.{streakDays:number, lastStreakUTC:number|null, lastActiveUTC:number|null, streakModel:string}
 * - Semantics:
 *    * First observed login under this model → streakDays = 0, lastStreakUTC = todayUTC (credited as "day 0"), streakModel set.
 *    * If lastStreakUTC === todayUTC → no-op (already credited for today).
 *    * If lastStreakUTC === yesterdayUTC → increment by +1.
 *    * Else (gap ≥ 2 days) → reset to 0 (today is day 0).
 */
export async function creditStreakIfNeeded(totalsRef: firestore.DocumentReference) {
  const now = Date.now();
  const todayUTC = startOfUTCDay(now);
  const yesterdayUTC = todayUTC - DAY_MS;

  const snap = await totalsRef.get();
  const prev = (snap.exists ? (snap.data() as any) : {}) || {};
  const prevModel = String(prev?.streakModel || "");
  const prevStreak = Number(prev?.streakDays || 0);
  const prevLast = prev?.lastStreakUTC == null ? null : startOfUTCDay(Number(prev.lastStreakUTC));

  // Rebase: migrate any legacy values onto the new model, starting at 0 today (approved).
  if (prevModel !== STREAK_MODEL) {
    await totalsRef.set(
      { streakDays: 0, lastStreakUTC: todayUTC, lastActiveUTC: now, streakModel: STREAK_MODEL },
      { merge: true }
    );
    return { streakDays: 0, lastStreakUTC: todayUTC, rebased: true };
  }

  // First ping under current model (missing lastStreakUTC)
  if (prevLast == null) {
    await totalsRef.set(
      { streakDays: 0, lastStreakUTC: todayUTC, lastActiveUTC: now, streakModel: STREAK_MODEL },
      { merge: true }
    );
    return { streakDays: 0, lastStreakUTC: todayUTC, firstCredit: true };
  }

  // Already credited for today
  if (prevLast === todayUTC) {
    await totalsRef.set({ lastActiveUTC: now }, { merge: true });
    return { streakDays: prevStreak, lastStreakUTC: prevLast, unchanged: true };
  }

  // Consecutive day → +1
  if (prevLast === yesterdayUTC) {
    const next = prevStreak + 1;
    await totalsRef.set(
      { streakDays: next, lastStreakUTC: todayUTC, lastActiveUTC: now },
      { merge: true }
    );
    return { streakDays: next, lastStreakUTC: todayUTC, incremented: true };
  }

  // Missed ≥1 day → reset to 0 (today becomes day 0)
  await totalsRef.set(
    { streakDays: 0, lastStreakUTC: todayUTC, lastActiveUTC: now },
    { merge: true }
  );
  return { streakDays: 0, lastStreakUTC: todayUTC, reset: true };
}
