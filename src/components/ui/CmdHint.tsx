"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";

type CmdHintProps = {
  onOpen?: () => void;
  storageKey?: string;
  delayMs?: number;
  corner?: "bl" | "br" | "tl" | "tr";
  className?: string;
  showWhen?: boolean;
};

export default function CmdHint({
  onOpen,
  storageKey = "BK_CMD_HINT_SEEN",
  delayMs = 800,
  corner = "br",
  className = "",
  showWhen = true,
}: CmdHintProps) {
  const [ready, setReady] = React.useState(false);
  const [seen, setSeen] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try { return localStorage.getItem(storageKey) === "1"; } catch { return true; }
  });

  React.useEffect(() => {
    const t = setTimeout(() => setReady(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);

  const dismiss = React.useCallback(() => {
    try { localStorage.setItem(storageKey, "1"); } catch {}
    setSeen(true);
  }, [storageKey]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || (target as any).isContentEditable);
      if (inInput) return;
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) dismiss();
    };
    window.addEventListener("keydown", onKey, { capture: true } as any);
    return () => window.removeEventListener("keydown", onKey, { capture: true } as any);
  }, [dismiss]);

  const handleOpen = React.useCallback(() => {
    dismiss();
    if (onOpen) onOpen();
  }, [dismiss, onOpen]);

  if (!ready || seen || !showWhen) return null;

  const cornerCls =
    corner === "br" ? "bottom-5 right-5" :
    corner === "bl" ? "bottom-5 left-5" :
    corner === "tr" ? "top-5 right-5" :
    "top-5 left-5";

  return (
    <AnimatePresence>
      <motion.button
        type="button"
        onClick={handleOpen}
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className={["fixed z-50 group", cornerCls, className].join(" ")}
        aria-label="Press question mark to open commands"
      >
        <span className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-orange-500/20 via-amber-400/10 to-purple-500/20 blur-md opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none" />
        <span className="relative inline-flex items-center gap-2 rounded-2xl px-3 py-2 bg-neutral-900/90 text-white shadow-lg ring-1 ring-white/10 backdrop-blur supports-[backdrop-filter]:bg-neutral-900/70">
          <span className="text-xs text-white/70">Press</span>
          <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-white/15 bg-white/10 px-2 text-sm font-semibold text-white/90 shadow-[inset_0_-1px_0_rgba(255,255,255,.15)]">?</kbd>
          <span className="text-xs text-white/70">to open</span>
          <span className="text-xs font-medium">Commands</span>
          <svg className="ml-1 h-4 w-4 opacity-70 group-hover:opacity-100 transition-opacity" viewBox="0 0 20 20" fill="none">
            <path d="M7 5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
        <span className="mt-1 block text-[10px] text-white/50 text-center">Click to open now</span>
      </motion.button>
    </AnimatePresence>
  );
}


