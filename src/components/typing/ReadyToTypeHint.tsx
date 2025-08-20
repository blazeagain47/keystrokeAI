"use client";
import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Props = { open?: boolean; onClose?: () => void; className?: string };

export default function ReadyToTypeHint({ open = true, onClose, className }: Props) {
  const [show, setShow] = useState(open);

  useEffect(() => setShow(open), [open]);

  // auto-dismiss after 7s and on first key press
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => setShow(false), 7000);
    const onKey = () => setShow(false);
    window.addEventListener("keydown", onKey, { once: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [show]);

  useEffect(() => {
    if (!show && onClose) onClose();
  }, [show, onClose]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          role="status"
          aria-live="polite"
          className={[
            "relative z-20 max-w-md rounded-2xl px-5 py-4",
            "bg-amber-900/40 ring-1 ring-amber-400/25 shadow-lg backdrop-blur",
            "text-amber-50/95",
            // subtle fire glow
            "before:absolute before:-inset-10 before:-z-10",
            "before:bg-[radial-gradient(40rem_40rem_at_100%_-10%,rgba(245,158,11,0.18),transparent_60%)]",
            className ?? ""
          ].join(" ")}
        >
          <div className="flex items-start gap-3">
            <Zap className="mt-0.5 h-5 w-5 text-amber-400" aria-hidden />
            <div className="text-sm leading-6">
              <p className="font-semibold">Ready to type?</p>
              <p className="opacity-90">
                Focus the typing area and start typing. Your speed and accuracy update in real time.
              </p>
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setShow(false)}
              className="ml-1 -mr-1 rounded-md px-2 py-1 text-amber-200/80 hover:text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-300/40"
            >
              ×
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


