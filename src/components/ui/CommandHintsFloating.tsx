"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useIdle } from "@/hooks/useIdle";

type CommandHintsFloatingProps = {
  context?: "typing" | "results" | "account";
  defaultMode?: "hidden" | "peek" | "full";
  className?: string;
};

const MODE_KEY = "bk:cmdHints.mode";
const DOCK_KEY = "bk:cmdHints.dock";
const COACH_KEY = "bk:cmdHints.coachShownV1";

export default function CommandHintsFloating({ context = "typing", defaultMode, className }: CommandHintsFloatingProps) {
  const [mode, setMode] = useState<"hidden" | "peek" | "full">(() => {
    const w = typeof window !== "undefined" ? window : undefined;
    const small = w ? w.innerWidth < 1024 : false;
    const ls = (() => { try { return localStorage.getItem(MODE_KEY) as any; } catch { return null; } })();
    if (ls === "hidden" || ls === "peek" || ls === "full") return ls;
    if (defaultMode) return defaultMode;
    if (context === "typing") return small ? "hidden" : "hidden";
    if (context === "results") return small ? "full" : "full";
    if (context === "account") return small ? "hidden" : "peek";
    return "peek";
  });
  const [dock, setDock] = useState<"br"|"bl"|"tr"|"tl">(() => {
    const v = (() => { try { return localStorage.getItem(DOCK_KEY) as any; } catch { return null; } })();
    if (v === "br" || v === "bl" || v === "tr" || v === "tl") return v;
    return "br";
  });

  const idle = useIdle(context === "typing" ? 4000 : 6000);

  // results: full on mount then peek
  useEffect(() => {
    if (context === "results") {
      setMode("full");
      const t = window.setTimeout(() => setMode("peek"), 8000);
      return () => window.clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // persist mode/dock
  useEffect(() => { try { localStorage.setItem(MODE_KEY, mode); } catch {} }, [mode]);
  useEffect(() => { try { localStorage.setItem(DOCK_KEY, dock); } catch {} }, [dock]);

  // on keydown -> cycle when ? pressed; Shift+D cycles dock
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        setMode(m => (m === "hidden" ? "peek" : m === "peek" ? "full" : "peek"));
      } else if ((e.key === "D" || e.key === "d") && e.shiftKey) {
        e.preventDefault();
        setDock(d => (d === "br" ? "bl" : d === "bl" ? "tl" : d === "tl" ? "tr" : "br"));
      } else {
        if (context !== "results" && mode !== "hidden") setMode("peek");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [context, mode]);

  // idle -> reveal as peek if hidden
  useEffect(() => {
    if (idle && mode === "hidden") setMode("peek");
  }, [idle, mode]);

  const dockClass = useMemo(() => ({ br: "right-6 bottom-6", bl: "left-6 bottom-6", tr: "right-6 top-24", tl: "left-6 top-24" }[dock]), [dock]);

  if (mode === "hidden") return null;

  const isPeek = mode === "peek";

  // one-time coachmark
  const showCoach = useMemo(() => {
    if (!(context === "results" || context === "account")) return false;
    try { return localStorage.getItem(COACH_KEY) !== "1"; } catch { return false; }
  }, [context]);

  const dismissCoach = useCallback(() => { try { localStorage.setItem(COACH_KEY, "1"); } catch {} }, []);

  return (
    <motion.aside
      data-mode={mode}
      data-dock={dock}
      role="complementary"
      aria-label="Keyboard commands"
      className={`hidden lg:flex fixed z-40 ${dockClass} ${className || ""}`}
    >
      {isPeek ? (
        <div className="bk-peek rounded-full px-3 py-1.5 text-sm bk-glass pointer-events-none hover:pointer-events-auto" title="Press ? to toggle • Shift+D to move">
          <span className="inline-flex items-center gap-1 text-white/80">
            <span className="w-2 h-2 rounded-full bg-orange-400" />
            Commands <kbd className="bk-kbd ml-2">?</kbd>
          </span>
        </div>
      ) : (
        <div className="bk-glass px-3 py-2 rounded-2xl min-w-[220px] relative">
          <div className="flex items-center justify-between mb-2">
            <div className="text-white/80 text-sm font-medium">Commands</div>
            <button onClick={()=>setDock(d => (d === "br" ? "bl" : d === "bl" ? "tl" : d === "tl" ? "tr" : "br"))} className="text-white/60 text-xs px-2 py-0.5 rounded border border-white/10 hover:bg-white/10">Dock</button>
          </div>
          <ul className="space-y-2 text-white/75 text-sm">
            <li className="flex items-center gap-2">
              <kbd className="bk-chip px-2 py-0.5">Tab</kbd>
              <span className="text-white/50">then</span>
              <kbd className="bk-chip px-2 py-0.5">Enter</kbd>
              <span className="ml-2 inline-flex items-center gap-1">
                <svg className="h-4 w-4 text-orange-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 2s4 3 4 7a4 4 0 1 1-8 0C8 5 12 2 12 2zM6 14c0 3.314 2.686 6 6 6s6-2.686 6-6c0-1.657-1-3-1-3s-.5 1.5-3 1.5S9 11 9 11s-3 1.343-3 3z" />
                </svg>
                <span className="font-semibold">New Test</span>
              </span>
            </li>
            <li className="flex items-center gap-2">
              <kbd className="bk-chip px-2 py-0.5">Space</kbd><span>Next word</span>
            </li>
            <li className="flex items-center gap-2">
              <kbd className="bk-chip px-2 py-0.5">Backspace</kbd><span>Go back</span>
            </li>
          </ul>

          {showCoach && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute -top-12 left-0 rounded-lg px-3 py-2 text-xs bk-glass shadow"
            >
              <div className="flex items-center gap-2 text-white/80">
                <span>Press ? to toggle commands. Hover to expand. Shift+D moves corners.</span>
                <button onClick={dismissCoach} className="text-white/60 border border-white/10 rounded px-1">×</button>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </motion.aside>
  );
}


