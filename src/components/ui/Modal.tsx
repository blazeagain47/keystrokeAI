'use client';
import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Optional: center card max width */
  maxWidth?: string;
  /** Optional: aria label for the dialog */
  ariaLabel?: string;
};

export default function Modal({
  open,
  onClose,
  children,
  maxWidth = 'max-w-md',
  ariaLabel = 'Dialog',
}: ModalProps) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('overflow-hidden');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('overflow-hidden');
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          role="dialog"
          aria-label={ariaLabel}
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Card */}
          <motion.div
            initial={{ y: 12, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 8, scale: 0.98, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className={`relative w-full ${maxWidth} rounded-2xl border border-white/10 bg-zinc-900/80 shadow-2xl`}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
