import { create } from "zustand";
import { persist } from "zustand/middleware";

type State = {
  isDocked: boolean;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  dock: () => void;
  undock: () => void;
};

export const useCommandHintsStore = create<State>()(
  persist(
    (set) => ({
      isDocked: true,
      isOpen: false,
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      dock: () => set({ isDocked: true, isOpen: false }),
      undock: () => set({ isDocked: false }),
    }),
    { name: "bk-command-hints" }
  )
);


