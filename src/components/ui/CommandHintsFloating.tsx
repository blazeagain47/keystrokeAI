"use client";
import React, { useEffect } from "react";
import { useCommandsStore } from "@/stores/commands";

export default function CommandHintsFloating({ context }: { context: "typing"|"results"|"account"|"home"|string }) {
  // Do not render the commands bar in the live typing view
  if (context === "typing") return null;
  const { open, docked, activeGroup, groups, openPanel, closePanel, toggleDocked } = useCommandsStore();
  const actions = React.useMemo(() => (activeGroup ? (groups[activeGroup] ?? []) : []), [activeGroup, groups]);

  // Only results view responds to hotkeys to open; Esc docks
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || (target as any).isContentEditable);
      if (inInput) return;
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        if (open) {
          closePanel();
        } else {
          openPanel();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        closePanel();
      }
    };
    window.addEventListener("keydown", onKey, { capture: true } as any);
    return () => window.removeEventListener("keydown", onKey, { capture: true } as any);
  }, [open, openPanel, closePanel]);

  return (
    <div className="fixed right-6 bottom-6 z-[100] pointer-events-auto select-none">
      {!open && (
        <div className="rounded-2xl bg-black/60 text-white px-4 py-3 shadow-lg backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="text-sm">Press <kbd className="bk-kbd">?</kbd> to open</span>
            <button
              className="text-xs underline opacity-80 hover:opacity-100"
              onClick={openPanel}
              aria-label="Open command hints"
            >
              Open now
            </button>
          </div>
        </div>
      )}

      {open && (
        <div role="dialog" aria-modal="true" className="rounded-2xl bg-neutral-900/90 text-white p-4 shadow-2xl w-[360px]">
          <div className="flex items-center justify-between mb-2">
            <div className="text-white/80 text-sm font-medium">Commands</div>
            <div className="flex items-center gap-2">
              <button
                className="text-xs underline opacity-80 hover:opacity-100"
                onClick={toggleDocked}
              >
                {docked ? "Undock" : "Dock"}
              </button>
              <button
                className="text-xs underline opacity-80 hover:opacity-100"
                onClick={closePanel}
              >
                Close
              </button>
            </div>
          </div>

          <ul className="mt-2 space-y-1">
            {actions.length === 0 ? (
              <li className="text-sm text-white/60">No actions available.</li>
            ) : (
              actions.map(a => (
                <li key={a.id}>
                  <button
                    className="w-full text-left px-2 py-1 rounded hover:bg-white/10 text-sm flex items-center justify-between"
                    onClick={() => { try { a.run(); } finally { if (!docked) closePanel(); } }}
                  >
                    <span>{a.label}</span>
                    {a.kbd && <kbd className="text-[10px] opacity-70">{a.kbd}</kbd>}
                  </button>
                </li>
              ))
            )}
          </ul>
          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-white/50">Press Esc to close</div>
          </div>
        </div>
      )}
    </div>
  );
}


