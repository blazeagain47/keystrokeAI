"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

type Context = "toggle" | "post";
type Props = {
  show: boolean;
  context?: Context;
  title?: string;
  lines?: string[];
};

export default function BlazeInterlude({
  show,
  context = "toggle",
  title = "Blaze mode (AI)",
  lines = [
    "AI is analyzing your last test…",
    "Training a harder set for you…",
    "Generating your next challenge…",
  ],
}: Props) {
  const [mounted, setMounted] = React.useState(false);
  const [step, setStep] = React.useState(0);

  React.useEffect(() => setMounted(true), []);

  // Cycle through status lines while visible. ~1.8s per word feels readable
  // without dragging on short waits.
  React.useEffect(() => {
    if (!show) return;
    setStep(0);
    const id = window.setInterval(() => {
      setStep((s) => (s + 1) % Math.max(1, lines.length));
    }, 1800);
    return () => window.clearInterval(id);
  }, [show, lines.length]);

  // Lock page scroll using global classes (mobile-friendly)
  React.useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    if (show) {
      html.classList.add("bk-lock");
      body.classList.add("bk-lock");
    } else {
      html.classList.remove("bk-lock");
      body.classList.remove("bk-lock");
    }
    return () => {
      html.classList.remove("bk-lock");
      body.classList.remove("bk-lock");
    };
  }, [show]);

  if (!mounted) return null;

  const heading =
    context === "post" ? "Analyzing & adapting your results…" : "Adapting your next test…";
  const activeLine = lines[step] ?? "";

  return createPortal(
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          key="bk-blaze-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Preparing your adaptive test"
          // Snap the cover layer in instantly so backdrop-filter applies on
          // the very first frame and masks any prompt/scroll changes happening
          // underneath as the test transitions. Only the exit fades.
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.30, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-0 overflow-hidden"
          style={{
            top: "var(--bk-header-h, 64px)",
            bottom: 0,
            zIndex: 95,
          }}
        >
          {/* Static frosted-glass backdrop — no fade-in, blur applies
              immediately on mount so the live typing UI is covered the
              moment the loader appears (no shutter from underlying
              prompt swap / scroll reset / view transition). */}
          <div aria-hidden className="bk-interlude-backdrop" />

          {/* Two slow-breathing warm auras layered above the blur and below
              the content stack. Different periods + screen blend = a
              non-repeating shimmer that keeps the loader feeling alive. */}
          <div className="bk-interlude-aura" aria-hidden />
          <div className="bk-interlude-aura bk-interlude-aura--drift" aria-hidden />

          {/* Centered minimal stack: pulsing brain logo, heading, rolodex line. */}
          <div className="relative h-full w-full grid place-items-center px-6">
            <div className="flex flex-col items-center text-center max-w-2xl -mt-[3vh]">
              {/* Pulsing brain — blazeKey logo with the colour pulse layered
                  directly onto the artwork (no rings). */}
              <motion.div
                initial={{ scale: 0.90, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.62, delay: 0.10, ease: [0.22, 1, 0.36, 1] }}
                aria-hidden
              >
                <div className="bk-pulse-brain">
                  <img
                    src="/blazeKey-tp-bg.png"
                    alt=""
                    className="bk-pulse-brain__img"
                    draggable={false}
                  />
                  <span className="bk-pulse-brain__shine" aria-hidden />
                </div>
              </motion.div>

              {/* Heading — red-leaning gradient (matches brain-loader-preview.html)
                  + Inter stylistic alternates for a sharper editorial look. */}
              <motion.div
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.55, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="bk-loader-heading bk-modern-display mt-8 font-semibold"
                style={{ fontSize: "clamp(1.35rem, 1.05rem + 0.9vw, 2.15rem)" }}
              >
                {heading}
              </motion.div>

              {/* Rolodex line — vertical slide-up flip between status words.
                  Warm peach tint matches the heading gradient's body tone. */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.45, delay: 0.42, ease: [0.22, 1, 0.36, 1] }}
                className="mt-3 relative h-9 w-full overflow-hidden"
                role="status"
                aria-live="polite"
              >
                <AnimatePresence initial={false} mode="wait">
                  <motion.div
                    key={step}
                    initial={{ y: 28, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -28, opacity: 0 }}
                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    className="bk-modern-display absolute inset-0 flex items-center justify-center text-base sm:text-lg font-medium"
                    style={{
                      color: "rgba(255, 220, 190, 0.82)",
                      textShadow: "0 0 14px rgba(255,160,80,0.22)",
                    }}
                  >
                    {activeLine}
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
