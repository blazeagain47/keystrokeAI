"use client";

import { useEffect, useRef } from "react";

import { usePartyStore } from "@/stores/usePartyStore";

interface GhostCursorProps {
  selfPlayerId: string;
  /** Pre-resolved opponent id from the caller. Falls back to store scan. */
  opponentPlayerId: string | null;
}

/**
 * Phase 5 ghost cursor. Reads the opponent's latest charIndex from
 * `usePartyStore.live.opponentProgress` and renders a fixed-position,
 * semi-transparent cyan bar that tracks the corresponding character span
 * (identified by `data-bk-ci` attributes stamped by TypingBox in party mode).
 *
 * Design constraints:
 *   - `position: fixed; top:0; left:0; transform: translate(x,y)` so the
 *     element lives outside every containing block (including TypingBox's
 *     `contain: layout` stacking context).
 *   - A rAF loop re-queries `getBoundingClientRect()` every frame. This
 *     keeps the cursor aligned when TypingBox applies a `translateY` scroll
 *     transform to advance a new line.
 *   - Lerp-based smoothing: on each frame the ghost cursor eases 30% of
 *     the remaining distance toward the target, giving a natural decay that
 *     bridges ~90ms progress_relay intervals and viewport-scroll jumps.
 *   - Opacity fades to 0 when no target span is found (opponent off-screen
 *     or disconnected) and snaps visible when found again.
 *   - `pointer-events: none` — never interferes with typing.
 *   - Zero cost in solo mode: this component is only mounted in PartyRace.
 */
export default function GhostCursor({
  selfPlayerId,
  opponentPlayerId,
}: GhostCursorProps) {
  const opponentProgress = usePartyStore((s) => s.live.opponentProgress);

  // Resolve opponent id: prefer the explicit prop, then scan the store.
  const resolvedId =
    opponentPlayerId ??
    Object.keys(opponentProgress).find((pid) => pid !== selfPlayerId) ??
    null;

  const entry = resolvedId ? opponentProgress[resolvedId] : null;
  const charIndex = entry?.sample.charIndex ?? null;

  const ghostRef = useRef<HTMLDivElement>(null);

  // Keep a mutable ref so the rAF loop always has the latest charIndex
  // without restarting the loop itself.
  const charIndexRef = useRef<number | null>(charIndex);
  useEffect(() => {
    charIndexRef.current = charIndex;
  }, [charIndex]);

  useEffect(() => {
    const ghost = ghostRef.current;
    if (!ghost) return;

    // Lerp state — persists across frames inside the closure.
    let lerpX = -1000; // start off-screen
    let lerpY = -1000;
    let targetX = -1000;
    let targetY = -1000;
    let targetH = 0;
    let visible = false;
    let rafId = 0;

    const LERP_FACTOR = 0.28; // ~90ms blend at 60fps

    const tick = () => {
      const ci = charIndexRef.current;

      if (ci == null) {
        // No charIndex yet — keep ghost invisible.
        if (visible) {
          ghost.style.opacity = "0";
          visible = false;
        }
        rafId = requestAnimationFrame(tick);
        return;
      }

      // Locate the target span. Try exact charIndex first; fall back to
      // charIndex-1 for the inter-word space position (no span exists there).
      let target = document.querySelector<HTMLElement>(`[data-bk-ci="${ci}"]`);
      if (!target && ci > 0) {
        target = document.querySelector<HTMLElement>(`[data-bk-ci="${ci - 1}"]`);
      }

      if (!target) {
        // Span not in DOM yet (first frame) or opponent is past end of text.
        if (visible) {
          ghost.style.opacity = "0";
          visible = false;
        }
        rafId = requestAnimationFrame(tick);
        return;
      }

      const rect = target.getBoundingClientRect();

      // Snap invisibly to target on first appearance to avoid a long initial
      // lerp from the off-screen starting point.
      if (!visible) {
        lerpX = rect.left;
        lerpY = rect.top;
        ghost.style.opacity = "1";
        visible = true;
      }

      // Update target.
      targetX = rect.left;
      targetY = rect.top;
      targetH = rect.height;

      // Lerp current position toward target.
      lerpX += (targetX - lerpX) * LERP_FACTOR;
      lerpY += (targetY - lerpY) * LERP_FACTOR;

      ghost.style.transform = `translate(${lerpX}px, ${lerpY}px)`;
      ghost.style.height = `${targetH}px`;

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, []); // Run once — charIndexRef is kept current via the sync effect above.

  return (
    <div
      ref={ghostRef}
      aria-hidden="true"
      data-testid="ghost-cursor"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        // Width matches the visual weight of the local BlazeKey cursor bar.
        width: "3px",
        pointerEvents: "none",
        // Sit above TypingBox content but below the debug HUD (z-9999).
        zIndex: 9000,
        willChange: "transform",
        // Cyan bar — clearly distinct from the local amber/white cursor.
        background:
          "linear-gradient(180deg, rgba(34,211,238,0.85) 0%, rgba(34,211,238,0.55) 100%)",
        borderRadius: "2px",
        boxShadow:
          "0 0 6px rgba(34,211,238,0.55), 0 0 12px rgba(34,211,238,0.25)",
        opacity: 0,
        // Opacity transition only — transform handled by lerp, not CSS.
        transition: "opacity 180ms ease-out",
      }}
    />
  );
}
