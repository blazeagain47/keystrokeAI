"use client";

import React, { useEffect, useState } from "react";

interface PartyCountdownProps {
  /** Server-authoritative epoch ms when the test should start. */
  startsAt: number;
  /** Test content preview shown beneath the countdown (host & guest see same). */
  preview?: string;
}

/**
 * Renders 3 / 2 / 1 / GO based on `startsAt` (server epoch ms). All clients
 * see synchronized countdowns because the server picks `startsAt` once and
 * broadcasts it; each client interpolates locally against Date.now().
 *
 * If the client's clock is drastically wrong relative to the server, the
 * countdown will appear shifted but never go below 0 — the server will fire
 * `test_started` at its own clock and the lobby will transition regardless.
 */
export default function PartyCountdown({ startsAt, preview }: PartyCountdownProps) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setNow(Date.now());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      try {
        cancelAnimationFrame(raf);
      } catch {}
    };
  }, []);

  const remainingMs = Math.max(0, startsAt - now);
  // Display logic: while ms remains, show ceiling seconds; when at or below
  // 0 ms show "GO" for a brief window before the server's test_started
  // event flips the lobby into the race screen.
  const label =
    remainingMs > 0 ? String(Math.ceil(remainingMs / 1000)) : "GO";

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-24 pb-16">
      <div className="rounded-2xl border border-orange-400/30 bg-gradient-to-br from-orange-500/10 via-red-500/5 to-transparent backdrop-blur-sm p-10 text-center">
        <p className="text-xs uppercase tracking-wider text-orange-300/80 mb-3">
          Starting in
        </p>
        <div
          key={label}
          className="font-mono font-bold text-7xl sm:text-8xl bg-[linear-gradient(135deg,#FF3D00,#FF6A00_55%,#FFD36E)] bg-clip-text text-transparent select-none bk-countdown-pop"
          aria-live="assertive"
          aria-atomic="true"
        >
          {label}
        </div>
        {preview && (
          <p className="mt-6 text-sm text-gray-400 max-w-xl mx-auto truncate font-mono">
            {preview.length > 80 ? preview.slice(0, 80) + "…" : preview}
          </p>
        )}
      </div>
      {/* Local pop animation, no global CSS edit needed. */}
      <style jsx>{`
        .bk-countdown-pop {
          animation: bk-pop 600ms ease-out;
        }
        @keyframes bk-pop {
          0% { transform: scale(0.7); opacity: 0.2; }
          60% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
