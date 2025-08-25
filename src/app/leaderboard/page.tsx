"use client";

import { useEffect, useMemo, useState } from "react";
import { Trophy, Crown, Medal, Award, Search } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { Card, CardContent } from "@/components/ui/card";
import { tl } from "@/lib/timeline";
import { devLog } from "@/lib/devLog";

type Row = { id: string; username: string; xpTotal: number; bestWpm?: number|null; streakDays?: number|null };

export default function LeaderboardPage() {
  const me = useAuthStore(s => s.user);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/leaderboard?limit=100", { cache: "no-store", credentials: "include" });
        const json = await res.json();
        setRows(Array.isArray(json?.rows) ? json.rows : []);
      } catch { setRows([]); }
    })();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows ?? [];
    return (rows ?? []).filter(r => r.username?.toLowerCase().includes(needle));
  }, [rows, q]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-amber-300" />
          <h1 className="text-xl font-semibold">Leaderboard</h1>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
          <input
            value={q}
            onChange={(e)=>setQ(e.target.value)}
            placeholder="Search players"
            className="pl-8 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-sm outline-none focus:ring-2 focus:ring-white/20"
          />
        </div>
      </header>

      <Podium rows={filtered.slice(0,3) as Row[]} meId={me?.id ? String(me.id) : null} />

      <Card className="rounded-2xl border border-white/10 bg-white/5">
        <CardContent className="p-0">
          {!rows ? (
            <div className="p-6 animate-pulse space-y-2">
              {Array.from({length:6}).map((_,i)=><div key={i} className="h-10 bg-white/5 rounded-xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-white/70">No players found.</div>
          ) : (
            <ul className="divide-y divide-white/10">
              {filtered.map((r, idx) => {
                const isMe = me && (String(me.id) === String(r.id) || me.username === r.username);
                return (
                  <li key={r.id} className={`flex items-center justify-between px-4 py-3 ${isMe ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"}`}>
                    <div className="flex items-center gap-3">
                      <RankBadge rank={idx+1} />
                      <AvatarDot name={r.username} />
                      <div className="flex items-center gap-2">
                        <span className="text-white/90 font-medium">{r.username}</span>
                        {isMe && <span className="text-xs text-white/70 bg-white/10 px-2 py-0.5 rounded-full">you</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      {typeof r.bestWpm === "number" && <span className="text-white/70"><span className="text-white/90 font-semibold">{r.bestWpm}</span> WPM best</span>}
                      {typeof r.streakDays === "number" && <span className="text-white/70"><span className="text-white/90 font-semibold">{r.streakDays}</span> day streak</span>}
                      <span className="text-white/70"><span className="text-white/90 font-semibold tabular-nums">{r.xpTotal}</span> XP</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-gradient-to-r from-orange-500/10 to-amber-300/10 p-4">
        <div className="text-white/80 text-sm">Want to climb faster? Practice a quick test.</div>
        <Link href="/#new" className="px-3 py-1.5 rounded-xl bg-white text-black text-sm font-medium" onClick={() => { try { tl("leaderboard New test click"); } catch {} ; try { devLog("nav: leaderboard new test"); } catch {} }}>New test</Link>
      </div>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="h-4 w-4 text-yellow-300" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-gray-300" />;
  if (rank === 3) return <Award className="h-4 w-4 text-amber-600" />;
  return <span className="w-6 text-right text-white/60 tabular-nums">#{rank}</span>;
}

function AvatarDot({ name }: { name: string }) {
  const letter = (name || "?").slice(0,1).toUpperCase();
  return (
    <div className="w-7 h-7 rounded-full grid place-items-center bg-white/10 ring-1 ring-white/10 text-white text-sm font-semibold">{letter}</div>
  );
}

function Podium({ rows, meId }: { rows: Row[]; meId: string | null }) {
  const [a,b,c] = rows;
  if (!rows?.length) return null;
  return (
    <div className="grid grid-cols-3 gap-3">
      {[b,a,c].map((r, i) => r ? (
        <div key={r.id} className={`rounded-2xl border border-white/10 p-4 ${i===1 ? "bg-gradient-to-b from-white/[0.08] to-transparent" : "bg-white/5"}`}>
          <div className="flex items-center gap-2 mb-2">{i===1 ? <Crown className="h-4 w-4 text-yellow-300"/> : <Trophy className="h-4 w-4 text-amber-300" />}<span className="text-white/80 text-sm">{i===1?"Champion":"Top"}</span></div>
          <div className="flex items-center gap-3">
            <AvatarDot name={r.username}/>
            <div className="leading-tight">
              <div className="text-white font-semibold">{r.username} {meId && String(r.id)===meId && <span className="text-xs text-white/70 bg-white/10 px-2 py-0.5 rounded-full ml-1">you</span>}</div>
              <div className="text-white/70 text-sm"><span className="text-white/90 font-semibold tabular-nums">{r.xpTotal}</span> XP</div>
            </div>
          </div>
        </div>
      ) : <div key={i} />)}
    </div>
  );
}


