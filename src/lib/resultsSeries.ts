import { ema } from "@/lib/statsMath";

export type WpmSample = { second: number; wpm: number };

const roundTimestamp = (seconds: number) => Math.round(seconds * 100) / 100;

export function elapsedSecondBucket(seconds: number) {
  if (!Number.isFinite(seconds)) return 1;
  return Math.max(1, Math.ceil(Math.max(0, seconds)));
}

function validSample(sample: WpmSample) {
  return Number.isFinite(sample.second) && Number.isFinite(sample.wpm);
}

/**
 * Keep the newest measurement for each elapsed-second bucket. The stored
 * timestamp remains the real elapsed time so charts do not have to reindex it.
 */
export function upsertLatestWpmSample(
  samples: readonly WpmSample[],
  elapsedSeconds: number,
  wpm: number,
): WpmSample[] {
  if (!Number.isFinite(elapsedSeconds) || !Number.isFinite(wpm)) {
    return samples.filter(validSample);
  }

  const point = {
    second: roundTimestamp(Math.max(0, elapsedSeconds)),
    wpm: Math.max(0, wpm),
  };
  const bucket = elapsedSecondBucket(point.second);
  const clean = samples.filter(validSample);

  if (!clean.length) return [point];

  const last = clean[clean.length - 1];
  const lastBucket = elapsedSecondBucket(last.second);
  if (bucket === lastBucket) {
    return [...clean.slice(0, -1), point];
  }
  if (point.second > last.second) {
    return [...clean, point];
  }

  // Defensive path for an out-of-order event. Coalesce and sort without
  // disturbing normal append-only collection.
  const byBucket = new Map<number, WpmSample>();
  for (const sample of [...clean, point].sort((a, b) => a.second - b.second)) {
    byBucket.set(elapsedSecondBucket(sample.second), sample);
  }
  return [...byBucket.values()].sort((a, b) => a.second - b.second);
}

/** Always end the display series on the official result. */
export function withOfficialFinalSample(
  samples: readonly WpmSample[],
  finalTimeSeconds: number,
  officialWpm: number,
) {
  return upsertLatestWpmSample(
    samples,
    Math.max(0, finalTimeSeconds || 0),
    officialWpm,
  );
}

/** Apply smoothing to display values only while preserving real timestamps. */
export function smoothWpmSamples(
  samples: readonly WpmSample[],
  alpha = 0.3,
): WpmSample[] {
  const clean = samples.filter(validSample);
  const smoothed = ema(
    clean.map((sample) => sample.wpm),
    alpha,
  );
  return clean.map((sample, index) => ({ ...sample, wpm: smoothed[index] }));
}

export function prepareResultsSeries(
  samples: readonly WpmSample[],
  finalTimeSeconds: number,
  officialWpm: number,
  alpha = 0.3,
) {
  return smoothWpmSamples(
    withOfficialFinalSample(samples, finalTimeSeconds, officialWpm),
    alpha,
  );
}

export function getTrendRevealProps(reducedMotion: boolean) {
  if (reducedMotion) {
    return {
      initial: false as const,
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0 },
    };
  }
  return {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.42, ease: "easeOut" as const },
  };
}
