"use client";
import React from "react";
import { useAuth } from "@/hooks/useAuth";

type Row = { id: string | number; username: string; xpTotal: number };

export default function Leaderboard() {
  const { user } = useAuth();
  const [rows, setRows] = React.useState<Row[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        const res = await fetch("/api/leaderboard?limit=10", { credentials: "include", cache: "no-store" });
        if (!res.ok) throw new Error(`http_${res.status}`);
        const data = await res.json();
        if (!cancelled) setRows(Array.isArray(data?.rows) ? data.rows : []);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "failed");
          setRows([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const Skeleton = () => (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-9 rounded-lg bg-white/5" />
      ))}
    </div>
  );

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-white font-medium">Leaderboard</div>
      <div className="text-white/50 text-sm mb-3">Top players by XP</div>

      {!rows ? (
        <Skeleton />
      ) : rows.length === 0 ? (
        <div className="text-white/60">No leaderboard data yet.</div>
      ) : (
        <div className="divide-y divide-white/10">
          {rows.map((r: Row, i: number) => {
            const isMe = user && (String(user.id) === String(r.id) || user.username === r.username);
            return (
              <div
                key={`${r.id}-${i}`}
                className={`flex items-center justify-between py-2 px-2 rounded-lg ${
                  isMe ? "bg-white/[0.06] ring-1 ring-white/10" : "hover:bg-white/[0.03]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 text-right text-white/50">#{i + 1}</div>
                  <div className="text-white/90">{r.username}</div>
                  {isMe && <span className="text-xs text-white/60 bg-white/10 px-2 py-0.5 rounded-full">you</span>}
                </div>
                <div className="text-white/80 tabular-nums">{r.xpTotal} XP</div>
              </div>
            );
          })}
        </div>
      )}

      {error && <div className="text-amber-300 text-sm mt-3">Couldn’t load leaderboard ({error}).</div>}
    </div>
  );
}


