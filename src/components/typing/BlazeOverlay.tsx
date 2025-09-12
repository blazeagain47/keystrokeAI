import { AnimatePresence, motion } from "framer-motion";
import React from "react";

export default function BlazeOverlay({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[65] grid place-items-center pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="rounded-2xl px-6 py-4 bg-black/60 text-white/90 ring-1 ring-white/10 backdrop-blur-md shadow-2xl"
          >
            <div className="text-xs uppercase tracking-wider opacity-80 mb-1">Blaze mode</div>
            <div className="text-sm">AI is analyzing your last test…</div>
            <div className="text-sm">Training a harder set for you…</div>
            <div className="text-sm">Generating your next challenge…</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}


