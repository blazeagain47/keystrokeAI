import { create } from "zustand";

type UIState = {
  settingsOpen: boolean;
  overlayOpen: boolean;
  isFocus: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  setOverlayOpen: (v: boolean) => void;
  setFocus: (v: boolean) => void;
};

export const useUIStore = create<UIState>((set, get) => ({
  settingsOpen: false,
  overlayOpen: false,
  isFocus: false,
  openSettings: () => set({ settingsOpen: true, overlayOpen: true, isFocus: false }),
  closeSettings: () => set({ settingsOpen: false, overlayOpen: false }),
  setOverlayOpen: (v: boolean) => set({ overlayOpen: v, ...(v ? { isFocus: false } : {}) }),
  setFocus: (v: boolean) => {
    set({ isFocus: v });
    try { document.documentElement.dataset.focus = v ? '1' : '0'; } catch {}
  },
}));


