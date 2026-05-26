// Progress-emission throttler used by the typing client to send `progress`
// events to the PartyKit room. We want:
//   1. local typing latency = 0 (the throttler MUST NOT block keystrokes),
//   2. opponent updates feel smooth (>= ~8 events/sec while typing),
//   3. no flood of duplicates when the user pauses (no charIndex movement).
//
// Strategy: lazy emit on call. If we've waited >= minMs since the last
// emit AND charIndex has changed, emit immediately. Otherwise, schedule
// a trailing emit at `lastEmitAt + minMs`. Always emit boundary events
// (start, finish) without throttling — the caller passes `force: true`.

export interface ProgressThrottlerOptions {
  /** Minimum ms between emits. Default 80ms ≈ 12.5Hz. */
  minMs?: number;
  /** Hard ceiling between emits even if nothing moved. Default 250ms. */
  maxMs?: number;
}

export interface ThrottlerSample {
  charIndex: number;
  correctChars: number;
  incorrectChars: number;
  wpm: number;
  accuracy: number;
  elapsedMs: number;
}

export interface ProgressThrottler {
  /** Submit a sample. Calls `emit(sample, sequence)` 0–1 times synchronously and may schedule a future emit. */
  submit(sample: ThrottlerSample, opts?: { force?: boolean }): void;
  /** Cancel any pending trailing emit. */
  dispose(): void;
  /** Last sequence number that has actually been emitted. */
  lastSequence(): number;
}

export function createProgressThrottler(
  emit: (sample: ThrottlerSample, sequence: number) => void,
  options: ProgressThrottlerOptions = {},
): ProgressThrottler {
  const minMs = options.minMs ?? 80;
  const maxMs = options.maxMs ?? 250;

  let lastEmitAt = 0;
  let lastEmittedCharIndex = -1;
  let sequence = 0;
  let trailingTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingSample: ThrottlerSample | null = null;
  let disposed = false;

  const now = (): number =>
    typeof performance !== "undefined" ? performance.now() : Date.now();

  const doEmit = (sample: ThrottlerSample) => {
    sequence += 1;
    lastEmitAt = now();
    lastEmittedCharIndex = sample.charIndex;
    pendingSample = null;
    try {
      emit(sample, sequence);
    } catch {
      // Swallow: emission failures must never break local typing.
    }
  };

  const scheduleTrailing = (sample: ThrottlerSample, waitMs: number) => {
    pendingSample = sample;
    if (trailingTimer != null) return;
    trailingTimer = setTimeout(() => {
      trailingTimer = null;
      if (disposed) return;
      const s = pendingSample;
      if (!s) return;
      doEmit(s);
    }, Math.max(0, waitMs));
  };

  return {
    submit(sample, opts) {
      if (disposed) return;
      const force = opts?.force === true;
      const t = now();
      const sinceLast = t - lastEmitAt;

      if (force) {
        if (trailingTimer != null) {
          clearTimeout(trailingTimer);
          trailingTimer = null;
        }
        doEmit(sample);
        return;
      }

      const moved = sample.charIndex !== lastEmittedCharIndex;

      if (sinceLast >= minMs && moved) {
        if (trailingTimer != null) {
          clearTimeout(trailingTimer);
          trailingTimer = null;
        }
        doEmit(sample);
        return;
      }

      if (sinceLast >= maxMs) {
        if (trailingTimer != null) {
          clearTimeout(trailingTimer);
          trailingTimer = null;
        }
        doEmit(sample);
        return;
      }

      // Coalesce: keep the freshest sample and schedule a trailing emit.
      const waitMs = moved ? Math.max(0, minMs - sinceLast) : Math.max(0, maxMs - sinceLast);
      scheduleTrailing(sample, waitMs);
    },

    dispose() {
      disposed = true;
      if (trailingTimer != null) {
        clearTimeout(trailingTimer);
        trailingTimer = null;
      }
      pendingSample = null;
    },

    lastSequence() {
      return sequence;
    },
  };
}
