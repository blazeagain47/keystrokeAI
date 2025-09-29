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

  // Cycle through status lines while visible
  React.useEffect(() => {
    if (!show) return;
    setStep(0);
    const id = window.setInterval(() => {
      setStep((s) => (s + 1) % Math.max(1, lines.length));
    }, 1000);
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

  return createPortal(
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          key="bk-blaze-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Preparing your adaptive test"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-x-0"
          style={{
            top: "var(--bk-header-h, 64px)",
            height: "calc(100dvh - var(--bk-header-h, 64px))",
            zIndex: 95,
          }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />
          <div className="bk-bottom-fade" aria-hidden />

          <div className="relative h-full w-full grid place-items-center p-4">
            <motion.div
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="w-full max-w-md rounded-2xl border border-white/10 bg-black/55 backdrop-blur-xl shadow-2xl ring-1 ring-white/10 p-6"
            >
              <div className="text-[10px] uppercase tracking-[0.16em] text-white/70 mb-2">
                {title}
              </div>

              <div className="flex items-center gap-5">
                <div className="relative h-20 w-20">
                  <div className="absolute inset-0 rounded-full opacity-70 animate-spin [animation-duration:2.8s] bg-[conic-gradient(from_0deg,rgba(255,145,0,0),rgba(255,145,0,.65),rgba(255,145,0,0))]" />
                  <div className="absolute inset-2 rounded-full opacity-60 animate-spin [animation-duration:5s] bg-[conic-gradient(from_180deg,rgba(255,90,0,0),rgba(255,90,0,.5),rgba(255,90,0,0))]" />
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="h-10 w-10 rounded-full bg-white/5 border border_white/10 shadow-inner" />
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="text-base font-medium text-white/95">{heading}</div>
                  <ul className="mt-2 space-y-1 text-sm" aria-live="polite">
                    {lines.map((t, i) => (
                      <li key={i} className={i === step ? "text-white" : "text-white/60"}>
                        <span
                          className={[
                            "mr-2 inline-block h-1.5 w-1.5 rounded-full align-middle",
                            i <= step ? "bg-amber-400" : "bg-white/30",
                          ].join(" ")}
                        />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-4 h-1 w-full rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  key={step}
                  initial={{ width: "0%" }}
                  animate={{ width: ["0%", "35%", "70%", "100%"] }}
                  transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity }}
                  className="h-full bg-gradient-to-r from-amber-400/70 via-orange-500/70 to-amber-300/70"
                />
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

