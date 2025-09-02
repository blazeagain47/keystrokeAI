import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CommandAction = {
  id: string;
  label: string;
  kbd?: string;
  run: () => void;
};

export type CommandGroupId = "typing" | "postTest" | "account" | string;

type CommandsState = {
  open: boolean;
  docked: boolean;
  activeGroup: CommandGroupId | null;
  groups: Record<string, CommandAction[]>;

  openPanel: () => void;
  closePanel: () => void;
  toggleDocked: () => void;

  registerGroup: (id: CommandGroupId, actions: CommandAction[]) => void;
  setActiveGroup: (id: CommandGroupId | null) => void;
};

const DOCK_LS = "BK_COMMANDS_DOCKED";

export const useCommandsStore = create<CommandsState>()(
  persist(
    (set, get) => ({
      open: false,
      docked: (() => {
        try { return localStorage.getItem(DOCK_LS) === "1"; } catch { return true; }
      })(),
      activeGroup: null,
      groups: {},

      openPanel: () => set({ open: true }),
      closePanel: () => set({ open: false }),
      toggleDocked: () => set(s => {
        const next = !s.docked;
        try { localStorage.setItem(DOCK_LS, next ? "1" : "0"); } catch {}
        return { docked: next } as Partial<CommandsState> as CommandsState;
      }),

      registerGroup: (id, actions) => set(s => ({ groups: { ...s.groups, [id]: actions } })),
      setActiveGroup: (id) => set({ activeGroup: id }),
    }),
    { name: "bk:commands:v1", partialize: (s) => ({ docked: s.docked, groups: s.groups }) as any }
  )
);


