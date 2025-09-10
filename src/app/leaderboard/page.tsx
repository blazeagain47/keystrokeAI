"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Trophy, Crown, Medal, Award, Search } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { Card, CardContent } from "@/components/ui/card";
import Modal from "@/components/ui/Modal";
import { tl } from "@/lib/timeline";
import { devLog } from "@/lib/devLog";

type Row = { id: string; username: string; xpTotal: number; xpToday?: number; lastUpdated?: string | null; photoURL?: string | null; bestWpm?: number|null; streakDays?: number|null };

export default function LeaderboardPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [meData, setMeData] = useState<{ username?: string } | null>(null);
  const [meRow, setMeRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [ctaOpen, setCtaOpen] = useState(false);

  // Close & remember the dismissal for 24h
  const dismissCta = () => {
    localStorage.setItem("lb_cta_hide_until", String(Date.now() + 24 * 60 * 60 * 1000));
    setCtaOpen(false);
  };

  useEffect(() => {
    (async () => {
      try {
        // 1) who am I?
        const meRes = await fetch("/api/auth/me", { cache: "no-store" }).catch(() => null);
        const meJson = meRes?.ok ? await meRes.json() : null;
        const meUsername = meJson?.username?.trim?.().toLowerCase?.() || "";

        setMeData(meJson ?? null);

        // 2) get leaderboard + meRow in one call
        const lbRes = await fetch(`/api/leaderboard?limit=50${meUsername ? `&meUsername=${encodeURIComponent(meUsername)}` : ""}`, { cache: "no-store" });
        const lb = lbRes.ok ? await lbRes.json() : { rows: [], me: null };

        setRows(lb.rows || []);
        setMeRow(lb.me || null);
        setNextCursor(lb.nextCursor || null);
        setLoading(false);

        // Decide whether to open the CTA
        const hideUntil = Number(localStorage.getItem("lb_cta_hide_until") || 0);
        if (!meJson && Date.now() > hideUntil) setCtaOpen(true);
      } catch (e) {
        console.error("Leaderboard fetch failed", e);
        setRows([]);
        setLoading(false);
      }
    })();
  }, []);

  const youId = useMemo(() => meRow?.id ?? null, [meRow]);
  const listHasMe = useMemo(() => (youId ? rows.some(r => r.id === youId) : false), [rows, youId]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(r => r.username?.toLowerCase().includes(needle));
  }, [rows, q]);

  const [searchRows, setSearchRows] = useState<Row[] | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const v = q.trim().toLowerCase();
    if (!v) { setSearchRows(null); return; }
    const h = setTimeout(async () => {
      try {
        const res = await fetch(`/api/leaderboard?q=${encodeURIComponent(v)}&limit=20`, { cache: "no-store", signal: controller.signal });
        const json = await res.json();
        setSearchRows(Array.isArray(json?.rows) ? json.rows : []);
      } catch { setSearchRows([]); }
    }, 250);
    return () => { clearTimeout(h); controller.abort(); };
  }, [q]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/10 rounded w-48"></div>
          <div className="space-y-2">
            {Array.from({length:6}).map((_,i)=><div key={i} className="h-12 bg-white/5 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={null}>
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Join-the-leaderboard CTA (logged-out only) */}
      <Modal open={ctaOpen} onClose={dismissCta} ariaLabel="Join the leaderboard">
        <div className="p-6 md:p-8">
          <h3 className="text-xl font-semibold mb-2">Join the leaderboard</h3>
          <p className="text-white/70 mb-6">
            Create a free account to claim your spot and start earning XP.
          </p>

          <div className="flex items-center gap-3">
            {/* Both buttons go to login to avoid 404s */}
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl bg-white text-black font-medium"
              onClick={() => setCtaOpen(false)}
            >
              Register
            </Link>

            <Link
              href="/login"
              className="px-4 py-2 rounded-xl border border-white/20 hover:bg-white/10"
              onClick={() => setCtaOpen(false)}
            >
              Sign in
            </Link>

            <button
              type="button"
              onClick={dismissCta}
              className="ml-auto px-3 py-2 text-white/70 hover:text-white"
            >
              Not now
            </button>
          </div>
        </div>
      </Modal>
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

      <Podium rows={filtered.slice(0,3) as Row[]} meId={youId} />

      <Card className="rounded-2xl border border-white/10 bg-white/5 cv-auto cv-480">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-6 text-white/70">No players yet. Create an account and we'll place you on the board instantly.</div>
          ) : (
            <ul className="divide-y divide-white/10">
              {(searchRows ?? filtered).map((r, idx) => {
                const isMe = !!youId && String(r.id) === String(youId);
                return (
                  <li key={r.id} className={`flex items-center justify-between px-4 py-3 ${isMe ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"}`}>
                    <div className="flex items-center gap-3">
                      <RankBadge rank={idx+1} />
                      <AvatarDot name={r.username} photoURL={r.photoURL} />
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

      {/* Pinned self card if not in the top N but signed-in */}
      {meRow && !listHasMe && !q && (
        <Card className="rounded-2xl border border-white/10 bg-white/5">
          <CardContent className="p-4">
            <div className="text-sm mb-2 text-white/70">Your position</div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AvatarDot name={meRow.username} photoURL={meRow.photoURL} />
                <div className="flex items-center gap-2">
                  <span className="text-white/90 font-medium">{meRow.username}</span>
                  <span className="text-xs text-white/70 bg-white/10 px-2 py-0.5 rounded-full">you</span>
                </div>
              </div>
              <div className="text-sm text-white/70">
                <span className="text-white/90 font-semibold tabular-nums">{meRow.xpTotal}</span> XP
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {(!q && nextCursor) ? (
        <div className="flex justify-center">
          <button
            className="mt-3 px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/10 text-sm"
            onClick={async () => {
              try {
                const res = await fetch(`/api/leaderboard?limit=50&after=${encodeURIComponent(nextCursor!)}`, { cache: "no-store", credentials: "include" });
                const json = await res.json();
                setRows([...(rows || []), ...((json?.rows as Row[]) || [])]);
                setNextCursor(json?.nextCursor || null);
              } catch {}
            }}
          >
            Load more
          </button>
        </div>
      ) : null}

      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-gradient-to-r from-orange-500/10 to-amber-300/10 p-4">
        <div className="text-white/80 text-sm">Want to climb faster? Practice a quick test.</div>
        <Link href="/#new" className="px-3 py-1.5 rounded-xl bg-white text-black text-sm font-medium" onClick={() => { try { tl("leaderboard New test click"); } catch {} ; try { devLog("nav: leaderboard new test"); } catch {} }}>New test</Link>
      </div>
    </div>
    </Suspense>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="h-4 w-4 text-yellow-300" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-gray-300" />;
  if (rank === 3) return <Award className="h-4 w-4 text-amber-600" />;
  return <span className="w-6 text-right text-white/60 tabular-nums">#{rank}</span>;
}

function AvatarDot({ name, photoURL }: { name: string; photoURL?: string | null }) {
  const letter = (name || "?").slice(0,1).toUpperCase();
  return (
    <div className="w-7 h-7 rounded-full grid place-items-center bg-white/10 ring-1 ring-white/10 text-white text-sm font-semibold overflow-hidden">
      {photoURL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="" src={photoURL} className="h-full w-full object-cover" />
      ) : (
        letter
      )}
    </div>
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
            <AvatarDot name={r.username} photoURL={r.photoURL}/>
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


