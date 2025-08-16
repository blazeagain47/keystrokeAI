"use client";

import { useEffect, useState } from "react";

type Row = { rank: number; username: string; xp: number; you?: boolean };

export default function Leaderboard() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/leaderboard", { credentials: "include" });
        const data = await res.json();
        if (!cancelled) {
          setRows(Array.isArray(data) ? data : []);
          setError(null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="rounded-2xl bg-slate-900/50 border border-white/10">
      <div className="p-5 border-b border-white/10">
        <h2 className="text-lg font-semibold text-white">Leaderboard</h2>
        <p className="text-sm text-slate-400">Top players by XP</p>
      </div>

      {loading && <div className="p-5 text-slate-300">Loading leaderboard…</div>}
      {error && (
        <div className="p-5 text-amber-300">
          Couldn’t load leaderboard. Showing a preview if available…
        </div>
      )}

      <ul className="divide-y divide-white/10">
        {(rows ?? []).map((row) => (
          <li
            key={row.rank + row.username}
            className={`flex items-center justify-between px-5 py-3 ${
              row.you ? "bg-blue-950/30" : ""
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="w-8 text-slate-300">#{row.rank}</span>
              <span className="text-white">{row.username}</span>
              {row.you && (
                <span className="text-xs rounded-full bg-blue-500/20 text-blue-200 px-2 py-0.5">
                  you
                </span>
              )}
            </div>
            <div className="text-slate-200">{row.xp} XP</div>
          </li>
        ))}
      </ul>
    </section>
  );
}


