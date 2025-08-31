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
  const dialogRef = React.useRef<HTMLDivElement | null>(null);

  const onWheelCapture = React.useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const el = dialogRef.current;
    if (!el) return;
    try {
      el.scrollTop += e.deltaY;
      e.preventDefault();
    } catch {}
  }, []);
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
        <div className="fixed inset-0 z-[100]">
          {/* Subtle, glassy overlay */}
          <div
            className="absolute inset-0 bg-black/45 backdrop-blur-md backdrop-saturate-150 transition-opacity"
            aria-hidden="true"
            onClick={onClose}
          />

          {/* Safe vertical gutters: 48px on md+, 24px on xs */}
          <div className="absolute inset-x-0 top-6 bottom-6 md:top-12 md:bottom-12 flex items-start justify-center px-3 sm:px-6">
            <motion.div
              role="dialog"
              aria-label={ariaLabel}
              aria-modal="true"
              initial={{ y: 12, scale: 0.985, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 8, scale: 0.985, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className={[
                // square dimensions + internal vertical scroll
                `max-w-[960px] md:max-w-[1040px] aspect-square`,
                `overflow-y-auto overscroll-contain rounded-2xl bg-neutral-900/80 shadow-2xl ring-1 ring-white/10`,
                `backdrop-blur-xl backdrop-saturate-150`,
                maxWidth,
              ].join(" ")}
              style={{ width: 'min(96vw, 960px, 86vh)', scrollbarGutter: 'stable both-edges', WebkitOverflowScrolling: 'touch' }}
              ref={dialogRef}
              onWheelCapture={onWheelCapture}
            >
              {children}
            </motion.div>
          </div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
