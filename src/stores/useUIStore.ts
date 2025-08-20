import { create } from "zustand";

type UIState = {
  settingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
};

export const useUIStore = create<UIState>((set) => ({
  settingsOpen: false,
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
}));


