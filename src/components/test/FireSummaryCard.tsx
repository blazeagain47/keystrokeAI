 "use client";
 import { useEffect, useState } from "react";
 import CountUp from "@/components/ui/CountUp";
 import FireSparkline from "@/components/ui/FireSparkline";
 import EmberField from "@/components/ui/EmberField";
 import { useStatsStore } from "@/stores/useStatsStore";
 import { computeRecentAverages } from "@/lib/recentStats";
 import SelectedTestChips from "@/components/results/SelectedTestChips";

type Props = {
  difficulty: string;            // e.g., "easy" -> must render "Easy"
  averageWPM: number;            // 77
  accuracy: number;              // 85 -> percent
  knobs: string[];               // ["Punctuation off", "Numbers off"]
  trend?: number[];              // sparkline values 0..100
  error?: string | null;         // if present, show small error line
  className?: string;            // allow external glow boost
  lastRunConfig?: {
    mode: "words" | "time" | "quote" | "zen" | "custom";
    wordCount?: number | null;
    durationSec?: number | null;
    language?: string | null;
    // canonical flags
    punctuation?: boolean | null;
    numbers?: boolean | null;
    // legacy/alternate names from usedConfig
    include_punctuation?: boolean | null;
    include_numbers?: boolean | null;
  };
  /** Optional area rendered at the very top of the card */
  headerSlot?: React.ReactNode;
  /** Optional content rendered before the Blaze stats pill */
  prepend?: React.ReactNode;
  /** Size for the second row (“Difficulty chosen”, “Your recent average”, “This test”) */
  secondarySize?: "sm" | "md";
};

export default function FireSummaryCard({
  difficulty,
  averageWPM,
  accuracy,
  knobs,
  trend = [30,65,58,72,63,60,68,71], // safe default
  error,
  className,
  lastRunConfig,
  headerSlot,
  prepend,
  secondarySize = "md",
}: Props) {
  const secSm = secondarySize === "sm";
  // Smaller overall presence in "sm"
  const diffText = secSm ? "text-lg font-semibold text-white" : "text-2xl font-semibold text-white";
  const avgNum    = secSm ? "text-lg sm:text-xl font-semibold text-fire leading-none"
                          : "text-2xl sm:text-3xl font-semibold text-fire leading-none";
  const avgLabel  = secSm ? "text-[10px] sm:text-[11px] text-white/60 leading-none tracking-tight"
                          : "text-xs sm:text-sm text-white/60 leading-none tracking-tight";
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

  // derive recent averages from store (fallback-safe)
  const history = (() => { try { return useStatsStore.getState().history as any[]; } catch { return []; } })();
  const { avgWpm, avgAcc, sampleCount } = computeRecentAverages(history, 5);
  const recentWpmDisplay = avgWpm == null ? "—" : String(avgWpm);
  const recentAccDisplay = avgAcc == null ? "—" : String(avgAcc);
  const subtitle = sampleCount > 0 ? "Your recent average" : "No recent runs";

  return (
    <section
      className={`
        relative bk-fire-card bk-card-sheen
        /* tighter vertical padding so the card ends right below the tiles */
        px-4 sm:px-5 pt-3 sm:pt-3 pb-2 sm:pb-3
        ${pulse ? "bk-pulse" : ""} ${className ?? ""}
      `}
    >
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
      <div className="relative z-10 space-y-3 md:space-y-3">
        {/* Header: modernized Blaze stats + animated tagline */}
        <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
          {/* Title (unified classes) */}
          <h3 className="text-base md:text-lg font-semibold text-left bk-title bk-title--glow">
            Blaze stats
          </h3>

          {/* Tagline with animated glow/shine (unchanged) */}
          <div className="relative overflow-hidden">
            <span className="bk-tagline block text-xs md:text-sm font-medium text-white/80">
              AI adapts the next typing prompt to your skill.
            </span>
            <span className="bk-tagline-shine" aria-hidden />
          </div>
        </div>
        {/* Then the compact metrics chips row (if provided) */}
        {prepend ? <div className="-mt-0.5">{prepend}</div> : null}
        {/* Optional extra header slot (unused by default) */}
        {headerSlot ? <div className="-mt-1">{headerSlot}</div> : null}

        {/* Metrics row */}
        <div className={secSm ? "grid grid-cols-1 sm:grid-cols-3 gap-3 mb-0" : "grid grid-cols-1 sm:grid-cols-3 gap-4 mb-0"}>
          {/* Difficulty */}
          <div className={secSm ? "bk-inner-tile p-2.5 md:p-3" : "bk-inner-tile p-3 md:p-4"} data-tone="amber">
            <div className="text-[10px] uppercase tracking-wide text-white/50 mb-1">
              Difficulty chosen
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className={diffText}>{prettyDifficulty}</span>
              <div className={secSm ? "hidden sm:block shrink-0 w-20 h-8" : "hidden sm:block shrink-0 w-24 h-10"}>
                <FireSparkline points={trend} className="w-full h-full pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Average */}
          <div className={secSm ? "bk-inner-tile p-2.5 md:p-3 pr-8 overflow-visible" : "bk-inner-tile p-3 md:p-4 pr-14 overflow-visible"} data-tone="orange">
            <div className="text-[10px] uppercase tracking-wide text-white/50 mb-1">
              {subtitle}
            </div>
            <div className="flex items-baseline flex-wrap justify-start gap-x-6 sm:gap-x-8 gap-y-1 sm:gap-y-0 bk-gap-compact">
              <span className="flex items-baseline gap-2 whitespace-nowrap shrink-0">
                <span className={avgNum}>
                  {recentWpmDisplay === "—" ? "—" : <CountUp value={Number(recentWpmDisplay)} />}
                </span>
                <span className={avgLabel}>WPM</span>
              </span>
              <span className="flex items-baseline gap-1 flex-wrap shrink-0 -mt-0.5 sm:mt-0">
                <span className={`${avgNum} tracking-tight whitespace-nowrap`}>
                  {recentAccDisplay === "—" ? "—" : <><CountUp value={Number(recentAccDisplay)} /><span className="align-baseline text-[0.9em] ml-0">%</span></>}
                </span>
                <span className={`${avgLabel} ml-1`}>Accuracy</span>
              </span>
            </div>
          </div>

          {/* This test */}
          <div className={secSm ? "bk-inner-tile p-2.5 md:p-3" : "bk-inner-tile p-3 md:p-4"}>
            <div className="text-[10px] uppercase tracking-wide text-white/50 mb-1">
              This test
            </div>
            <SelectedTestChips
              dense
              size={secSm ? "sm" : "md"}
              mode={lastRunConfig?.mode ?? "words"}
              wordCount={lastRunConfig?.wordCount ?? null}
              durationSec={lastRunConfig?.durationSec ?? null}
              language={lastRunConfig?.language ?? "english"}
              // accept both naming styles
              punctuation={!!(
                (lastRunConfig && "punctuation" in (lastRunConfig ?? {})) ? lastRunConfig?.punctuation : lastRunConfig?.include_punctuation
              )}
              numbers={!!(
                (lastRunConfig && "numbers" in (lastRunConfig ?? {})) ? lastRunConfig?.numbers : lastRunConfig?.include_numbers
              )}
            />
          </div>
        </div>

        {/* Error line (only when error) */}
        {error && !noisy ? <div className="bk-error-line">{error}</div> : null}
      </div>
    </section>
  );
}


