"use client";
import React from "react";
import CountUp from "@/components/ui/CountUp";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

type Props = {
  rank: string;                // e.g., "Master"
  message: React.ReactNode;    // main AI text
  xp: number;                  // total xp
  streak: number;              // streak count
  challenge: string;           // "Hit ≥95% accuracy next run (+40 XP)"
  className?: string;
};

type RankTheme = {
  grad: string;     // background gradient for pill
  glow: string;     // shadow glow
  ring: string[];   // conic ring colors [c1,c2,c3]
};

const rankThemes: Record<string, RankTheme> = {
  master: { grad: "linear-gradient(135deg,#ffb703,#ffd166)", glow: "0 0 0 1px rgba(255,183,3,.2) inset, 0 16px 36px -16px rgba(255,183,3,.55)", ring: ["#ffb703","#ff7e00","#ffd166"] },
  pro:    { grad: "linear-gradient(135deg,#ff6a00,#ffd36e)", glow: "0 0 0 1px rgba(255,106,0,.2) inset, 0 16px 36px -16px rgba(255,106,0,.55)", ring: ["#ff3d00","#ff6a00","#ffd36e"] },
  rookie: { grad: "linear-gradient(135deg,#ff3d00,#ff6a00)", glow: "0 0 0 1px rgba(255,61,0,.2) inset, 0 16px 36px -16px rgba(255,61,0,.55)", ring: ["#ff3d00","#ff6a00","#ff9a3d"] },
  default:{ grad: "linear-gradient(135deg,#FF3D00,#FF6A00 55%,#FFD36E)", glow: "0 0 0 1px rgba(255,106,0,.1) inset, 0 12px 28px -16px rgba(255,106,0,.45)", ring: ["#FF3D00","#FF6A00","#FFD36E"] },
};

function RankPretty({ rank }: { rank: string }) {
  const key = (rank || "").toLowerCase();
  const theme = rankThemes[key] || rankThemes.default;
  const label = rank ? rank[0].toUpperCase() + rank.slice(1).toLowerCase() : "Pro";
  return (
    <span
      className="bk-rank-badge"
      style={{
        background: theme.grad,
        boxShadow: theme.glow,
        // pass custom ring colors via CSS variable fallback in gradient string
        // not strictly needed; the ::before uses var(--bk-fire-*) defaults
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden className="opacity-90">
        <defs>
          <linearGradient id="bkBoltRank" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={theme.ring[0]} />
            <stop offset="0.6" stopColor={theme.ring[1]} />
            <stop offset="1" stopColor={theme.ring[2]} />
          </linearGradient>
        </defs>
        <path d="M13.5 2 5 13.2h5.6L10 22l9-12.4h-5.5L13.5 2z" fill="url(#bkBoltRank)" />
      </svg>
      {label}
    </span>
  );
}

export default function BlazeFeedbackCard({ rank, message, xp, streak, challenge, className }: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const authed = Boolean(user);
  const handleLogin = () => router.push("/login?from=results");
  React.useEffect(() => {
    try {
      const el = document.getElementById("bk-next-challenge");
      const txt = el?.getAttribute("data-challenge-text") || "";
      (window as any).__bkChallengeText = txt;
    } catch {}
  }, [challenge]);
  return (
    <section className={`relative bk-fire-card bk-card-sheen p-4 sm:p-5 ${className ?? ""}`}>
      {/* tiny local embers */}
      <div aria-hidden className="bk-card-embers">
        {Array.from({ length: 8 }).map((_, i) => (
          <span
            key={i}
            style={{
              left: `${Math.random() * 100}%`,
              bottom: "-6px",
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${4 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 space-y-3 sm:space-y-4">
        {/* Header chip with brand wordmark */}
        <div className="bk-chart-title mb-2">
          <h3 className="text-base md:text-lg font-semibold bk-wordmark">AI Feedback</h3>
        </div>

        {/* Main message */}
        <div className="flex items-start gap-2 text-white/90">
          <p className="text-sm sm:text-base leading-6">{message}</p>
        </div>

        {/* XP earned pill (last run) */}
        {(() => {
          const [lastXp, setLastXp] = React.useState<number | null>(null);
          React.useEffect(() => {
            const h = (e: any) => {
              const val = Number(e?.detail?.total ?? e?.detail ?? 0);
              if (Number.isFinite(val) && val > 0) setLastXp(val);
            };
            window.addEventListener("blaze:xp", h as any);
            return () => window.removeEventListener("blaze:xp", h as any);
          }, []);
          return lastXp && lastXp > 0 ? (
            <div className="mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 bg-white/10 border border-white/10">
              <span className="text-fire font-semibold tabular-nums">+{lastXp} XP</span>
              <span className="text-white/60 text-xs">great run!</span>
            </div>
          ) : null;
        })()}

        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="bk-rank-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden className="opacity-90">
              <defs>
                <linearGradient id="bkBoltRank" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="var(--bk-fire-1)" />
                  <stop offset="0.6" stopColor="var(--bk-fire-2)" />
                  <stop offset="1" stopColor="var(--bk-fire-3)" />
                </linearGradient>
              </defs>
              <path d="M13.5 2 5 13.2h5.6L10 22l9-12.4h-5.5L13.5 2z" fill="url(#bkBoltRank)" />
            </svg>
            {rank?.[0]?.toUpperCase() + rank?.slice(1)?.toLowerCase() || "Pro"}
          </span>

          {authed ? (
            <>
              <span className="bk-cta">
                <span className="text-white/70">Total XP:</span>
                <span className="cta-main font-semibold ml-1"><CountUp value={xp} /></span>
              </span>
              <span className="bk-cta">
                <span className="text-white/70">Streak:</span>
                <span className="cta-main font-semibold ml-1"><CountUp value={streak} /></span>
                <span className="text-white/60 ml-1">days</span>
              </span>
            </>
          ) : (
            <button type="button" onClick={handleLogin} className="bk-cta" aria-label="Log in to track stats with Blaze AI">
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden className="opacity-80">
                <path d="M12 2a10 10 0 1 1 0 20" stroke="rgba(255,255,255,.6)" fill="none"/>
                <path d="M8 12h8M12 8v8" stroke="rgba(255,255,255,.85)"/>
              </svg>
              <span className="cta-main font-semibold">Log in</span>
              <span className="text-white/75 ml-1">to track stats with Blaze AI</span>
            </button>
          )}
        </div>

        {/* Next challenge */}
        <div className="mt-1">
          <div className="flex items-center gap-2 text-white/90">
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
              <circle cx="12" cy="12" r="9" fill="none" stroke="rgba(255,255,255,.35)"/>
              <circle cx="12" cy="12" r="3" fill="url(#bkBoltRank)" />
            </svg>
            <span className="text-sm">Next challenge:</span>
            <span className="text-sm font-semibold ml-1">
              <span
                id="bk-next-challenge"
                data-challenge-text={challenge || ""}
                className="text-fire"
              >
                {challenge}
              </span>
            </span>
          </div>
          <div className="bk-challenge-rail mt-2" aria-hidden />
        </div>
      </div>
    </section>
  );
}
