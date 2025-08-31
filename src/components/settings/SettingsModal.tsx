"use client";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useUIStore } from "@/stores/useUIStore";
import Modal from "@/components/ui/Modal";
import SettingsPanel from "./SettingsPanel";

export default function SettingsModal() {
  const open = useUIStore((s) => s.settingsOpen);
  const close = useUIStore((s) => s.closeSettings);
  const initialFocusRef = useRef<HTMLButtonElement | null>(null);

  // Restore focus to the gear button when closing (best effort)
  useEffect(() => {
    if (!open) {
      try {
        const gear = document.querySelector('[aria-label="Settings"]') as HTMLElement | null;
        gear?.focus?.();
      } catch {}
    }
  }, [open]);

  return (
    <Modal open={open} onClose={close} ariaLabel="Settings">
      <div className="relative before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-white/0 before:via-white/30 before:to-white/0">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 sm:px-8 py-4 backdrop-blur supports-[backdrop-filter]:bg-black/30">
          <h2 className="text-base font-semibold tracking-wide text-white/90">Settings</h2>
          <button
            ref={initialFocusRef}
            aria-label="Close settings"
            onClick={close}
            className="rounded-full p-2 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 sm:p-8 pt-2">
          <SettingsPanel />
        </div>
      </div>
    </Modal>
  );
}


