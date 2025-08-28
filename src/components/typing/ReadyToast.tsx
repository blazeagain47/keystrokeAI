"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

type Props = {
  text?: string;
  subtext?: string;
  anchorSelector?: string;
  timeoutMs?: number;
};

function useAnchorRect(selector: string) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) return;
    const update = () => setRect(el.getBoundingClientRect());
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [selector]);

  return rect;
}

export default function ReadyToast({
  text = "Ready to type?",
  subtext = "Focus the typing area and start typing. Your speed and accuracy update in real time.",
  anchorSelector = "[data-lang-pill]",
  timeoutMs = 10000,
}: Props) {
  const [show, setShow] = useState(true);
  const dismissedRef = useRef(false);
  const rect = useAnchorRect(anchorSelector);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Shift" || e.key === "Alt" || e.key === "Control" || e.key === "Meta") return;
      if (!dismissedRef.current) { dismissedRef.current = true; setShow(false); }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true } as any);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      if (!dismissedRef.current) { dismissedRef.current = true; setShow(false); }
    }, timeoutMs);
    return () => clearTimeout(id);
  }, [timeoutMs]);

  if (typeof document === "undefined") return null;

  const style: React.CSSProperties | undefined = rect
    ? {
        position: "fixed",
        top: Math.max(12, rect.bottom + 8),
        // Horizontal positioning handled by className (right + safe area)
      }
    : undefined;

  return createPortal(
    <AnimatePresence initial={true}>
      {show && !!style && (
        <motion.div
          style={style}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.16 }}
          className="z-[70] pointer-events-auto right-4 md:right-6 xl:right-8 safe-right"
        >
          <div className="relative max-w-sm w-[clamp(14rem,24vw,18rem)] break-words rounded-lg px-4 py-3 bg-neutral-900/90 ring-1 ring-white/10 shadow-xl">
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-6 rounded-2xl"
              style={{
                background:
                  "radial-gradient(40% 55% at 70% 0%, rgba(255,120,40,.35), transparent 60%), radial-gradient(60% 60% at 10% 30%, rgba(255,60,0,.18), transparent 60%)",
                filter: "blur(18px)",
                opacity: 0.9,
              }}
            />
            <div className="relative">
              <div className="flex items-start gap-3">
                <div className="mt-1 h-5 w-5 shrink-0 rounded-md bg-amber-500/15 ring-1 ring-amber-400/30 flex items-center justify-center">
                  <span className="text-amber-400">⚡</span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-amber-100">{text}</div>
                  <div className="mt-1 text-xs leading-5 text-amber-100/80">{subtext}</div>
                </div>
                <button aria-label="Dismiss" onClick={() => setShow(false)} className="rounded-md p-1 text-amber-200/70 hover:text-amber-100 hover:bg-white/5">
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}


