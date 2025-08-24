import { getIdTokenEnsured } from "@/lib/idToken";

export async function fetchRecentRuns(limit = 20) {
  const token = await getIdTokenEnsured();
  const res = await fetch(`/api/runs/recent?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`recent_runs_failed: ${res.status}`);
  return res.json() as Promise<{ ok: true; runs: Array<{ id: string; createdAt: number | null; wpm: number | null; accuracy: number | null; durationSec: number | null; mode: string | null; }> }>;
}

export async function fetchMyTotals() {
  const token = await getIdTokenEnsured();
  const res = await fetch(`/api/totals/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`totals_failed: ${res.status}`);
  return res.json() as Promise<{ ok: true; totals: null | { totalRuns: number; totalXP: number; bestWpm: number | null; avgWpm: number | null; avgAcc: number | null; totalTimeSec: number; lastActiveUTC: number | null; streakDays: number; } }>;
}


