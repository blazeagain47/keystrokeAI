 "use client";
 import { useEffect, useState } from "react";
 import CountUp from "@/components/ui/CountUp";
 import FireSparkline from "@/components/ui/FireSparkline";
 import EmberField from "@/components/ui/EmberField";

type Props = {
  difficulty: string;            // e.g., "easy" -> must render "Easy"
  averageWPM: number;            // 77
  accuracy: number;              // 85 -> percent
  knobs: string[];               // ["Punctuation off", "Numbers off"]
  trend?: number[];              // sparkline values 0..100
  error?: string | null;         // if present, show small error line
  className?: string;            // allow external glow boost
};

export default function FireSummaryCard({
  difficulty,
  averageWPM,
  accuracy,
  knobs,
  trend = [30,65,58,72,63,60,68,71], // safe default
  error,
  className,
}: Props) {
  const prettyDifficulty = difficulty ? difficulty[0].toUpperCase() + difficulty.slice(1).toLowerCase() : "Easy";

  // one-shot pulse when key values change
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 950);
    return () => clearTimeout(t);
  }, [prettyDifficulty, averageWPM, accuracy, JSON.stringify(knobs)]);

  // filter out noisy backend hint
  const noisy = typeof error === "string" && /please ensure backend is running/i.test(error);

  return (
    <section className={`relative bk-fire-card bk-card-sheen p-4 sm:p-5 ${pulse ? "bk-pulse" : ""} ${className ?? ""}`}>
      <EmberField count={12} />
      <div aria-hidden className="bk-card-embers">
        {Array.from({ length: 6 }).map((_, i) => (
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
      <div className="relative z-10 space-y-4">
        {/* Blaze stats header pill */}
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80 ring-1 ring-white/10">
          <span className="inline-flex items-center gap-1 font-semibold tracking-wide">
            <svg width="14" height="14" viewBox="0 0 24 24" className="opacity-90">
              <defs>
                <linearGradient id="bkBolt" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#FF3D00" />
                  <stop offset="0.6" stopColor="#FF6A00" />
                  <stop offset="1" stopColor="#FFD36E" />
                </linearGradient>
              </defs>
              <path d="M13.5 2 5 13.2h5.6L10 22l9-12.4h-5.5L13.5 2z" fill="url(#bkBolt)" />
            </svg>
            Blaze stats
          </span>
          {(() => {
            const badge = "AI adapts the next typing prompt to your skill.";
            return (
              <span className="px-2 py-0.5 rounded-full text-[11px] bg-white/5 border border-white/10">
                <span className="sr-only">{badge}</span>
                <span aria-hidden className="bk-wave-words">
                  {badge.trim().split(/\s+/).map((word, wi) => (
                    <span key={wi} className="bk-wave-fire">
                      {word.split("").map((ch, ci) => (
                        <span key={ci} style={{ ["--i" as any]: wi * 8 + ci } as React.CSSProperties}>{ch}</span>
                      ))}
                    </span>
                  ))}
                </span>
              </span>
            );
          })()}
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Difficulty */}
          <div className="bk-tile">
            <div className="text-[10px] uppercase tracking-wide text-white/50 mb-1">
              Difficulty chosen
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-2xl font-semibold text-white">{prettyDifficulty}</span>
              <div className="hidden sm:block shrink-0 w-24 h-10">
                <FireSparkline points={trend} className="w-full h-full pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Average */}
          <div className="bk-tile pr-14 overflow-visible">
            <div className="text-[10px] uppercase tracking-wide text-white/50 mb-1">
              Your recent average
            </div>
            <div className="flex items-baseline flex-wrap justify-start gap-x-6 sm:gap-x-8 gap-y-1 sm:gap-y-0 bk-gap-compact">
              <span className="flex items-baseline gap-2 whitespace-nowrap shrink-0">
                <span className="text-2xl sm:text-3xl font-semibold text-fire leading-none">
                  <CountUp value={averageWPM} />
                </span>
                <span className="text-xs sm:text-sm text-white/60 leading-none tracking-tight">WPM</span>
              </span>
              <span className="flex items-baseline gap-1 flex-wrap shrink-0 -mt-0.5 sm:mt-0">
                <span className="text-2xl sm:text-3xl font-semibold text-fire leading-none tracking-tight whitespace-nowrap">
                  <CountUp value={accuracy} />
                  <span className="align-baseline text-[0.9em] ml-0">%</span>
                </span>
                <span className="text-xs sm:text-sm text-white/60 leading-none ml-1">acc</span>
              </span>
            </div>
          </div>

          {/* Knobs */}
          <div className="bk-tile">
            <div className="text-[10px] uppercase tracking-wide text-white/50 mb-1">
              Next test knobs
            </div>
            <div className="flex flex-wrap gap-2">
              {knobs.map((k, i) => (
                <span key={i} className="bk-tag">{k}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Error line (only when error) */}
        {error && !noisy ? <div className="bk-error-line">{error}</div> : null}
      </div>
    </section>
  );
}


