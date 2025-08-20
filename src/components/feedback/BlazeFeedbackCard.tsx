"use client";
import React from "react";
import CountUp from "@/components/ui/CountUp";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import FireProgress from "@/components/ui/FireProgress";

type Props = {
  rank: string;                // e.g., "Master"
  message: React.ReactNode;    // main AI text
  xp: number;                  // total xp
  streak: number;              // streak count
  challenge: string;           // "Hit ≥95% accuracy next run (+40 XP)"
  className?: string;
};

// simple tier dot mapping
function tierDotClass(tier?: string) {
  const t = (tier || "").toLowerCase();
  if (t === "legend") return "#FF3D00";
  if (t === "master") return "#FF6A00";
  if (t === "pro") return "#FFD36E";
  return "var(--bk-fire-2, #FF6A00)";
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
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base md:text-lg font-semibold bk-wordmark">AI Feedback</h3>
          {!!rank && (
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10" aria-label={`Tier ${rank}`}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: tierDotClass(rank) }} />
              <span className="text-fire font-medium">{rank}</span>
            </span>
          )}
        </div>

        {/* Main message */}
        <div className="flex items-start gap-2 text-white/90">
          <div className="text-sm sm:text-base leading-6">{message}</div>
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

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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
          <FireProgress className="mt-2" />
        </div>
      </div>
    </section>
  );
}
