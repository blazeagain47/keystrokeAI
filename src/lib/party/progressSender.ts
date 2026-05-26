// Fire-and-forget progress emitter for the typing race. Wraps the shared
// `createProgressThrottler` and pushes `progress` events to a `PartyClientHandle`.
//
// CONTRACTS:
//   - submit() MUST return synchronously. The typing engine calls this on
//     every keystroke/stat-tick; it must NEVER block on the network.
//   - The throttler decides cadence (≈10–12 Hz). Boundary events (first
//     keystroke, finish) can be passed `{ force: true }` to bypass throttling.
//   - Every emitted message carries a monotonic per-player `sequence` minted
//     here. The server uses it to drop stale frames.
//   - If the socket isn't open yet, `client.send()` silently drops; that's
//     fine — the next frame will resend the latest sample.
//
// This module is browser-only (depends on a live PartySocket). Do not import
// it from server routes.

import { createProgressThrottler, type ThrottlerSample } from "./throttle";
import type { PartyClientHandle } from "./client";

export interface ProgressSenderOptions {
  /** Minimum ms between sends. Default 90ms (~11Hz). */
  minMs?: number;
  /** Hard ceiling between sends. Default 250ms. */
  maxMs?: number;
}

export interface ProgressSender {
  /**
   * Submit the latest local stats. Fire-and-forget.
   * `force=true` bypasses throttling (use for finish / first-keystroke).
   */
  submit(sample: ThrottlerSample, opts?: { force?: boolean }): void;
  /** Cancel any trailing send and detach. */
  dispose(): void;
  /** Latest emitted sequence (for debugging/HUD). */
  lastSequence(): number;
}

export function createProgressSender(
  client: PartyClientHandle,
  playerId: string,
  options: ProgressSenderOptions = {},
): ProgressSender {
  const throttler = createProgressThrottler(
    (sample, sequence) => {
      // Build the wire message and hand it to the socket. PartySocket's
      // .send() buffers while CONNECTING, and our wrapper catches throws.
      // Either way: this call cannot block the typing engine.
      try {
        client.send({
          type: "progress",
          playerId,
          sequence,
          charIndex: sample.charIndex,
          correctChars: sample.correctChars,
          incorrectChars: sample.incorrectChars,
          wpm: sample.wpm,
          accuracy: sample.accuracy,
          elapsedMs: sample.elapsedMs,
          clientTs: Date.now(),
        });
      } catch {
        // Swallow: network failures must never break local typing.
      }
    },
    { minMs: options.minMs ?? 90, maxMs: options.maxMs ?? 250 },
  );

  return {
    submit: (sample, opts) => throttler.submit(sample, opts),
    dispose: () => throttler.dispose(),
    lastSequence: () => throttler.lastSequence(),
  };
}
