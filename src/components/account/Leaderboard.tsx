"use client";

import React from "react";
import { useOnVisible } from "@/lib/useOnVisible";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Crown, Medal, Award, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type Row = { id: string | number; username?: string; xpTotal: number; avatarUrl?: string | null };

function looksLikeUid(s: string) {
  return /^[A-Za-z0-9_-]{8,}$/.test(s) && !/[.@]/.test(s);
}

export default function Leaderboard() {
  const { user } = useAuth();
  const { ref, visible } = useOnVisible<HTMLDivElement>("250px");
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

        let list: Row[] = Array.isArray(data?.rows) ? data.rows : [];
        const needsLookup = list.filter(r => !r.username || looksLikeUid(String(r.username))).map(r => String(r.id));
        if (needsLookup.length) {
          try {
            const r = await fetch(`/api/users/usernames?ids=${encodeURIComponent(needsLookup.join(","))}`, { cache: "no-store" });
            if (r.ok) {
              const { map } = await r.json();
              list = list.map((it) => {
                const m = map?.[String(it.id)];
                return m ? { ...it, username: m.username, avatarUrl: m.avatarUrl ?? it.avatarUrl } : it;
              });
            }
          } catch { /* best-effort */ }
        }

        if (!cancelled) setRows(list);
      } catch (e: any) {
        if (!cancelled) { setRows([]); setError(e?.message ?? "failed"); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div ref={ref} className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 cv-auto cv-480">
      <div className="flex items-center gap-2 text-white font-medium">
        <Trophy className="h-5 w-5 text-yellow-400" />
        Leaderboard
        <span className="text-white/50 text-sm ml-2">Top players by XP</span>
      </div>

      {!rows || !visible ? (
        <div className="mt-3 space-y-2 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 rounded-xl bg-white/5" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-white/60 mt-3">No leaderboard data yet.</div>
      ) : (
        <div className="mt-3">
          <AnimatePresence initial={false}>
            {rows.map((r, i) => {
              const me = user && (String(user.id) === String(r.id) || user?.username === r?.username);
              const rank = i + 1;
              const top = rows[0]?.xpTotal || 1;
              const pct = Math.round((r.xpTotal / top) * 100);
              const RankIcon = rank === 1 ? Crown : rank === 2 ? Medal : rank === 3 ? Award : null;

              return (
                <motion.div
                  key={`${r.id}-${i}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className={`relative overflow-hidden rounded-xl border border-white/10 px-3 py-2 mb-2 ${me ? "bg-white/[0.08] ring-1 ring-white/10" : "hover:bg-white/[0.05]"}`}
                >
                  <div aria-hidden className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500/10 to-transparent" style={{ width: `${Math.max(8, pct)}%` }} />

                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-7 text-right text-white/50 tabular-nums">#{rank}</div>
                      <div className="h-8 w-8 rounded-full bg-white/10 grid place-items-center text-white/80 text-sm font-medium overflow-hidden">
                        {r.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img alt="" src={r.avatarUrl} className="h-full w-full object-cover" />
                        ) : (
                          (r.username?.[0] || "?").toUpperCase()
                        )}
                      </div>
                      <div className="text-white/90 truncate max-w-[40vw] sm:max-w-[22rem]">
                        {r.username || `user-${String(r.id).slice(0, 6)}`}
                        {me && (
                          <span className="ml-2 text-[11px] text-white/80 inline-flex items-center gap-1 rounded-full px-2 py-0.5 bg-white/10">
                            <Sparkles className="h-3 w-3 text-orange-300" /> you
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-white/90 tabular-nums">
                      <span className="font-semibold">{r.xpTotal}</span> <span className="text-white/60">XP</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {error && <div className="text-amber-300 text-sm mt-3">Couldn’t load leaderboard ({error}).</div>}
    </div>
  );
}
