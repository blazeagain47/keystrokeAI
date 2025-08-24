'use client';

import { useEffect, useState } from 'react';
import { fetchRecentRuns, fetchMyTotals } from '@/lib/runsApi';
import { getIdTokenEnsured } from '@/lib/idToken';

type Run = { id: string; createdAt: number | null; wpm: number | null; accuracy: number | null; durationSec: number | null; mode: string | null; };
type Totals = { totalRuns: number; totalXP: number; bestWpm: number | null; avgWpm: number | null; avgAcc: number | null; totalTimeSec: number; lastActiveUTC: number | null; streakDays: number; } | null;

export default function DevConsolePage() {
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [totals, setTotals] = useState<Totals>(null);
  const [tokenTail, setTokenTail] = useState<string>('');
  const [err, setErr] = useState<string>('');

  async function loadAll() {
    setErr('');
    try {
      const token = await getIdTokenEnsured();
      setTokenTail(token.slice(-16));
      const [r, t] = await Promise.all([fetchRecentRuns(10), fetchMyTotals()]);
      setRuns(r.runs);
      // @ts-ignore
      setTotals(t.totals ?? null);
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  useEffect(() => { void loadAll(); }, []);

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Dev Console</h1>

      <div className="flex items-center gap-3">
        <button onClick={loadAll} className="px-3 py-2 rounded-xl shadow border">Refresh</button>
        <span className="text-sm opacity-70">token…{tokenTail || '—'}</span>
        {err && <span className="text-red-600 text-sm">{err}</span>}
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Totals</h2>
        {!totals ? <div className="opacity-60">No totals yet.</div> : (
          <ul className="text-sm grid grid-cols-2 md:grid-cols-4 gap-2">
            <li><b>Total runs:</b> {totals.totalRuns}</li>
            <li><b>XP:</b> {totals.totalXP}</li>
            <li><b>Best WPM:</b> {totals.bestWpm ?? '—'}</li>
            <li><b>Avg WPM:</b> {Math.round((totals.avgWpm ?? 0) * 10)/10}</li>
            <li><b>Avg Acc:</b> {Math.round((totals.avgAcc ?? 0)*10)/10}%</li>
            <li><b>Total time:</b> {totals.totalTimeSec}s</li>
            <li><b>Streak:</b> {totals.streakDays} day(s)</li>
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Recent Runs</h2>
        {!runs?.length ? <div className="opacity-60">No runs yet.</div> : (
          <div className="overflow-x-auto">
            <table className="min-w-[600px] text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">When</th>
                  <th className="py-2 pr-4">Mode</th>
                  <th className="py-2 pr-4">WPM</th>
                  <th className="py-2 pr-4">Acc</th>
                  <th className="py-2 pr-4">Dur</th>
                  <th className="py-2 pr-4">ID</th>
                </tr>
              </thead>
              <tbody>
                {runs.map(r => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}</td>
                    <td className="py-2 pr-4">{r.mode ?? '—'}</td>
                    <td className="py-2 pr-4">{r.wpm ?? '—'}</td>
                    <td className="py-2 pr-4">{r.accuracy ?? '—'}%</td>
                    <td className="py-2 pr-4">{r.durationSec ?? '—'}s</td>
                    <td className="py-2 pr-4">{r.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}


