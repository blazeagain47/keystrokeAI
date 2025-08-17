"use client";
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
  const title = "Smart test";
  const subtitle = "adapted your next prompt";

  const prettyDifficulty = difficulty ? difficulty[0].toUpperCase() + difficulty.slice(1).toLowerCase() : "Easy";

  return (
    <section className={`relative glass-card fire-border glow p-4 sm:p-5 ${className ?? ""}`}>
      <EmberField count={12} />
      <div className="relative z-10 space-y-4">
        {/* Title pill */}
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80 ring-1 ring-white/10">
          <span className="font-medium">{title}</span>
          <span className="text-white/60">{subtitle}</span>
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Difficulty */}
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="text-[10px] uppercase tracking-wide text-white/50 mb-1">
              Difficulty chosen
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-semibold text-white">
                {prettyDifficulty}
              </span>
              <FireSparkline points={trend} className="hidden sm:block" />
            </div>
          </div>

          {/* Average */}
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="text-[10px] uppercase tracking-wide text-white/50 mb-1">
              Your recent average
            </div>
            <div className="flex items-baseline gap-4">
              <span className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-semibold text-fire">
                  <CountUp value={averageWPM} />
                </span>
                <span className="text-xs sm:text-sm text-white/60">WPM</span>
              </span>
              <span className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-semibold text-fire">
                  <CountUp value={accuracy} />
                </span>
                <span className="text-xs sm:text-sm text-white/60">% acc</span>
              </span>
            </div>
          </div>

          {/* Knobs */}
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="text-[10px] uppercase tracking-wide text-white/50 mb-1">
              Next test knobs
            </div>
            <div className="text-sm sm:text-base text-white/90 leading-5">
              {knobs.map((k, i) => (
                <span key={i}>
                  {k}{i < knobs.length - 1 ? " • " : ""}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Error line (only when error) */}
        {error ? (
          <div className="text-xs text-white/60">
            {error}
          </div>
        ) : null}
      </div>
    </section>
  );
}


