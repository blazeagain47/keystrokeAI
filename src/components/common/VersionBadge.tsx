import React, { useEffect, useRef, useState } from "react";
import { GitBranch, X } from "lucide-react";

export default function VersionBadge() {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popRef.current && popRef.current.contains(t)) return;
      if (btnRef.current && btnRef.current.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="version-popover"
        className="inline-flex items-center gap-2 rounded-full bg-white/5 text-white/80 hover:text-white ring-1 ring-white/10 hover:bg-white/10 px-3 py-1 text-sm transition"
        title="Version"
      >
        <GitBranch className="h-4 w-4" />
        <span className="font-medium tabular-nums">v1.0.5</span>
      </button>

      {open && (
        <div
          id="version-popover"
          role="dialog"
          aria-modal="true"
          ref={popRef}
          className="absolute right-0 mt-2 w-[28rem] max-w-[90vw] rounded-2xl bg-white/5 ring-1 ring-white/10 shadow-2xl backdrop-blur p-4 z-50"
        >
          <div className="flex items-start justify-between">
            <div className="text-white/90 font-semibold">Release notes</div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="text-white/60 hover:text-white transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2 space-y-3 text-sm text-white/80">
            <div className="rounded-lg bg-white/5 ring-1 ring-white/10 p-3">
              <div className="text-white font-medium">v1.0.5 — Public beta polish</div>
              <ul className="list-disc pl-5 mt-1 space-y-1 text-white/80">
                <li>New: Blaze history now merges local + server runs; calendar-day ranges for Today / 7 days.</li>
                <li>Fix: AI Feedback metrics (Peak/Consistency) smoothed; baselines aligned.</li>
                <li>Update: Account header cleanup; Member Since card moved; profile card shows full email + status.</li>
              </ul>
            </div>

            <div className="rounded-lg bg-white/5 ring-1 ring-white/10 p-3">
              <div className="text-white font-medium">Coming next</div>
              <ul className="list-disc pl-5 mt-1 space-y-1 text-white/80">
                <li>Per-mode insights & daily goals</li>
                <li>Achievements v2 with shareable badges</li>
                <li>Changelog auto-feed from releases</li>
              </ul>
            </div>

            <div className="text-xs text-white/60">
              Tip: Press <kbd className="px-1 py-0.5 rounded bg-white/10">Esc</kbd> to close.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


