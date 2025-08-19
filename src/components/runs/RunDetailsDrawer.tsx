"use client";

import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BlazeRun } from "@/lib/historyLocal";
import RunDetailsCard from "@/components/runs/RunDetailsCard";

type Props = {
  run: BlazeRun | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export default function RunDetailsDrawer({ run, open, onOpenChange }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onOpenChange(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="fixed inset-0 z-[90]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
          <motion.div
            initial={{ x: 360, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 360, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="absolute right-0 top-0 h-full w-full max-w-md p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Run details"
          >
            {run && (
              <RunDetailsCard run={run} showClose onClose={() => onOpenChange(false)} />
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}


