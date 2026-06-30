"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Trophy, Crown, Medal, Award, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Modal from "@/components/ui/Modal";
import CountUpNumber from "@/components/account/CountUpNumber";
import { tl } from "@/lib/timeline";
import { devLog } from "@/lib/devLog";

type Row = { id: string; username: string; xpTotal: number; xpToday?: number; lastUpdated?: string | null; photoURL?: string | null; bestWpm?: number|null; streakDays?: number|null };

const FIRE_BTN_STYLE = {
  background: "linear-gradient(135deg, #d9460a 0%, #e8600f 50%, #f07a1a 100%)",
  boxShadow: "0 0 0 1px rgba(255,106,0,0.18) inset, 0 4px 16px -6px rgba(255,90,0,0.35)",
};

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
        <div className="bk-fire-card p-6 animate-pulse h-[40px] w-48" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="bk-fire-card animate-pulse h-[120px]" />)}
        </div>
        <div className="bk-fire-card animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 border-b border-white/5 last:border-0" />)}
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
              className="px-4 py-2 rounded-xl text-white font-medium transition-transform hover:scale-[1.03]"
              style={FIRE_BTN_STYLE}
              onClick={() => setCtaOpen(false)}
            >
              Register
            </Link>

            <Link
              href="/login"
              className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/10 hover:border-orange-400/30 transition-colors"
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
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-[#FF3D00]/20 to-[#FFB066]/20 ring-1 ring-orange-400/20">
            <Trophy className="h-5 w-5 text-amber-300" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-fire leading-tight">Leaderboard</h1>
            <p className="text-xs text-white/40">Top players, ranked by XP</p>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            value={q}
            onChange={(e)=>setQ(e.target.value)}
            placeholder="Search players"
            className="pl-8 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-sm outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400/30 transition-colors"
          />
        </div>
      </header>

      <Podium rows={filtered.slice(0,3) as Row[]} meId={youId} />

      <div className="bk-fire-card cv-auto cv-480 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-6 text-white/70">No players yet. Create an account and we'll place you on the board instantly.</div>
          ) : (
            <ul className="divide-y divide-white/5">
              {(searchRows ?? filtered).map((r, idx) => {
                const isMe = !!youId && String(r.id) === String(youId);
                return (
                  <li
                    key={r.id}
                    className={`flex items-center justify-between px-4 py-3 transition-colors duration-150 ${isMe ? "bg-orange-500/[0.06]" : "hover:bg-white/[0.03]"}`}
                  >
                    <div className="flex items-center gap-3">
                      <RankBadge rank={idx+1} />
                      <AvatarDot name={r.username} photoURL={r.photoURL} />
                      <div className="flex items-center gap-2">
                        <span className="text-white/90 font-medium">{r.username}</span>
                        {isMe && <span className="text-xs text-orange-300 bg-orange-500/15 border border-orange-500/30 px-2 py-0.5 rounded-full">you</span>}
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
      </div>

      {/* Pinned self card if not in the top N but signed-in */}
      {meRow && !listHasMe && !q && (
        <div className="bk-fire-card bk-card-sheen p-4">
            <div className="text-sm mb-2 text-white/50">Your position</div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AvatarDot name={meRow.username} photoURL={meRow.photoURL} />
                <div className="flex items-center gap-2">
                  <span className="text-white/90 font-medium">{meRow.username}</span>
                  <span className="text-xs text-orange-300 bg-orange-500/15 border border-orange-500/30 px-2 py-0.5 rounded-full">you</span>
                </div>
              </div>
              <div className="text-sm text-white/70">
                <CountUpNumber value={meRow.xpTotal} className="text-fire font-semibold tabular-nums text-base" /> <span className="text-white/50">XP</span>
              </div>
            </div>
        </div>
      )}

      {(!q && nextCursor) ? (
        <div className="flex justify-center">
          <button
            className="mt-3 px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/10 hover:border-orange-400/30 transition-colors text-sm"
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

      <div className="bk-fire-card p-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-[#FF3D00]/20 to-[#FFB066]/20 ring-1 ring-orange-400/20">
            <Sparkles className="h-5 w-5 text-amber-300" />
          </div>
          <div>
            <div className="text-white font-semibold">Want to climb faster?</div>
            <div className="text-white/50 text-sm">Practice a quick test and watch your XP grow.</div>
          </div>
        </div>
        <Link
          href="/#new"
          className="px-4 py-2 rounded-xl text-sm font-medium text-white shrink-0 transition-transform hover:scale-[1.03]"
          style={FIRE_BTN_STYLE}
          onClick={() => { try { tl("leaderboard New test click"); } catch {} ; try { devLog("nav: leaderboard new test"); } catch {} }}
        >
          New test →
        </Link>
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
    <Avatar className="h-7 w-7 ring-1 ring-orange-500/20 shrink-0">
      <AvatarImage src={photoURL ?? undefined} alt={name} />
      <AvatarFallback className="text-sm bg-gradient-to-br from-[#FF3D00] via-[#FF6A00] to-[#FFB066] text-white">
        {letter}
      </AvatarFallback>
    </Avatar>
  );
}

function Podium({ rows, meId }: { rows: Row[]; meId: string | null }) {
  const [a, b, c] = rows;
  if (!rows?.length) return null;

  return (
    <div className="grid grid-cols-3 items-stretch gap-3">
      {[b, a, c].map((r, i) =>
        r ? (
          <article
            key={r.id}
            className={[
              "bk-fire-card bk-card-sheen group relative p-4",
              "transition-all duration-300 ease-out will-change-transform",
              // shared hover treatment for all 3 cards
              "hover:-translate-y-0.5 hover:ring-2 hover:ring-orange-400/20",
              "hover:shadow-[0_10px_28px_-16px_rgba(0,0,0,.35)]",
              // champion (center) gets a raised baseline + fire aura
              i === 1
                ? [
                    "ring-1 ring-orange-400/25",
                    "shadow-[0_8px_24px_-14px_rgba(255,140,0,.25)]",
                    "motion-safe:-translate-y-1 md:motion-safe:-translate-y-1.5",
                    "motion-safe:animate-bk-glow-slow",
                  ].join(" ")
                : "",
            ].join(" ")}
          >
            {/* Champion hover aura — a soft radial glow that fades in on hover */}
            {i === 1 && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300
                           group-hover:opacity-100
                           [mask-image:radial-gradient(60%_60%_at_50%_0%,#000_40%,transparent_100%)]
                           bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(255,140,0,.20),rgba(255,140,0,0)_60%)]"
              />
            )}

            <div className="relative z-10">
              <div className="mb-2 flex items-center gap-2">
                {i === 1 ? (
                  <Crown className="h-4 w-4 text-yellow-300" />
                ) : (
                  <Trophy className="h-4 w-4 text-amber-400/70" />
                )}
                <span className="text-sm text-white/60">{i === 1 ? "Champion" : "Top"}</span>
              </div>

              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 ring-2 ring-orange-500/25 shrink-0">
                  <AvatarImage src={r.photoURL ?? undefined} alt={r.username} />
                  <AvatarFallback className="text-sm bg-gradient-to-br from-[#FF3D00] via-[#FF6A00] to-[#FFB066] text-white">
                    {(r.username || "?").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="leading-tight min-w-0">
                  <div className="text-white font-semibold truncate">
                    {r.username}{" "}
                    {meId && String(r.id) === meId && (
                      <span className="ml-1 rounded-full bg-orange-500/15 border border-orange-500/30 px-2 py-0.5 text-xs text-orange-300">you</span>
                    )}
                  </div>
                  <div className="text-sm text-white/60">
                    <CountUpNumber value={r.xpTotal} className="text-fire font-semibold tabular-nums" /> XP
                  </div>
                </div>
              </div>
            </div>
          </article>
        ) : (
          <div key={i} />
        )
      )}
    </div>
  );
}
