"use client";
import React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

type Props = {
  show: boolean;
  title?: string;
  lines?: string[];
};

export default function BlazeInterlude({
  show,
  title = "Blaze mode",
  lines = [
    "AI is analyzing your last test…",
    "Training a harder set for you…",
    "Generating your next challenge…",
  ],
}: Props) {
  const [mounted, setMounted] = React.useState(false);

  // Ensure header height CSS var exists so we can offset correctly
  React.useEffect(() => {
    setMounted(true);
    try {
      const root = document.documentElement;
      const existing = getComputedStyle(root)
        .getPropertyValue("--bk-header-h")
        .trim();
      if (!existing || existing === "0" || existing === "0px") {
        const h =
          (document.querySelector("[data-app-header]") as HTMLElement)
            ?.getBoundingClientRect().height ?? 64;
        root.style.setProperty("--bk-header-h", `${Math.round(h)}px`);
      }
    } catch {}
  }, []);

  // Block scroll while visible
  React.useEffect(() => {
    if (!show) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [show]);

  if (!mounted) return null;

  const overlay = (
    <AnimatePresence>
      {show && (
        <motion.div
          key="bk-blaze-interlude"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          // Tailwind for layout (bullet-proof against scoping)
          style={{
            // Keep header visible
            top: "var(--bk-header-h, 64px)",
            // Explicit viewport height to avoid any parent clipping
            height: "calc(100dvh - var(--bk-header-h, 64px))",
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 90,
            display: "grid",
            placeItems: "center",
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            backdropFilter: "blur(12px)",
          }}
        >
          {/* Uiverse-inspired loader card */}
          <div className="bk-blaze-card">
            <div className="bk-loader">
              <p>loading</p>
              <div className="bk-words" aria-hidden="true">
                <span className="bk-word">analyzing</span>
                <span className="bk-word">training</span>
                <span className="bk-word">adapting</span>
                <span className="bk-word">generating</span>
                <span className="bk-word">analyzing</span>
              </div>
            </div>
            <div className="bk-copy">
              <div className="bk-eyebrow">{title}</div>
              {lines.map((t, i) => (
                <div className="bk-line" key={i}>
                  {t}
                </div>
              ))}
            </div>
          </div>

          <style jsx>{`
            /* Card container */
            .bk-blaze-card {
              --bg-color: #111;
              --accent: var(--bk-accent, #FF6A00);
              background-color: var(--bg-color);
              padding: 1.25rem 2rem 1.6rem;
              border-radius: 1.25rem;
              box-shadow: 0 20px 60px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.06) inset;
              max-width: clamp(720px, 64vw, 1040px);  /* a touch wider so nothing crops */
              width: 100%;
              color: #eaeaea;
              pointer-events: auto;
              display: flex;
              flex-direction: column;
              align-items: center;   /* center all content */
              gap: 12px;
              overflow: visible;     /* never clip the animated row */
            }

            .bk-loader {
              color: rgb(180,180,180);
              font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial;
              font-weight: 600;
              font-size: 28px;
              height: 44px;
              padding: 8px 12px;
              display: flex;
              align-items: center;
              justify-content: center;     /* center the pair */
              gap: 14px;                   /* keep your current visual spacing */
              border-radius: 10px;
              width: 100%;                 /* make the row span the card */
              margin: 0;                   /* no side bias */
              /* nudge the whole row slightly to the right; paint-only (no layout) */
              transform: translateX(var(--bk-loader-nudge-x, 8px));
            }
            /* REMOVE any earlier nudges we added to the static word */
            .bk-loader p { margin: 0; transform: none; }

            /* keep children from stretching oddly (no side bias) */
            .bk-loader > p,
            .bk-loader > .bk-words {
              flex: 0 0 auto;
            }

            .bk-words {
              overflow: hidden;
              position: relative;
              height: 36px;               /* taller viewport for vertical loop */
              line-height: 36px;
              min-width: 14ch;            /* "generating" fits with room */
              white-space: nowrap;
            }
            .bk-words::after {
              content: "";
              position: absolute;
              inset: 0;
              background: linear-gradient(
                var(--bg-color) 6%,
                transparent 24%,
                transparent 76%,
                var(--bg-color) 94%
              );                          /* softer fade to avoid "cut off" look */
              z-index: 2;
              pointer-events: none;
            }
            .bk-word {
              display: block;
              height: 100%;
              line-height: 36px;
              padding-left: 6px;
              color: var(--accent);       /* use brand accent (orange) */
              animation: spin_4991 4s infinite;
              will-change: transform;
              text-shadow: 0 0 8px color-mix(in oklab, var(--accent), transparent 70%);
            }
            /* Exact step offsets to eliminate fractional clipping on some GPUs */
            @keyframes spin_4991 {
              10%  { transform: translateY(-100%); }
              25%  { transform: translateY(-100%); }
              35%  { transform: translateY(-200%); }
              50%  { transform: translateY(-200%); }
              60%  { transform: translateY(-300%); }
              75%  { transform: translateY(-300%); }
              85%  { transform: translateY(-400%); }
              100% { transform: translateY(-400%); }
            }

            .bk-copy { margin-top: .25rem; width: 100%; text-align: center; }
            .bk-eyebrow {
              text-transform: uppercase;
              letter-spacing: .08em;
              font-size: 11px;
              opacity: .75;
              margin-bottom: 4px;
              color: #f6b27a;             /* keep as-is; pairs well with accent */
            }
            .bk-line { font-size: 14px; line-height: 1.35; color: #d7d7d7; }

            /* Responsive */
            @media (max-width: 640px) {
              .bk-blaze-card { max-width: calc(100vw - 1.5rem); padding: .9rem 1rem 1.1rem; border-radius: 1rem; }
              .bk-loader     {
                font-size: 22px; height: 38px; gap: 10px;
                transform: translateX(var(--bk-loader-nudge-mobile-x, 4px));
              }
              .bk-words      { height: 30px; line-height: 30px; min-width: 12ch; }
              .bk-word       { line-height: 30px; }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Render OUTSIDE any local stacking context
  return createPortal(overlay, document.body);
}

