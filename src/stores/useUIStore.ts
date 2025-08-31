import { create } from "zustand";

type UIState = {
  settingsOpen: boolean;
  overlayOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  setOverlayOpen: (v: boolean) => void;
};

export const useUIStore = create<UIState>((set) => ({
  settingsOpen: false,
  overlayOpen: false,
  openSettings: () => set({ settingsOpen: true, overlayOpen: true }),
  closeSettings: () => set({ settingsOpen: false, overlayOpen: false }),
  setOverlayOpen: (v: boolean) => set({ overlayOpen: v }),
}));


