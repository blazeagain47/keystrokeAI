"use client";

import { create } from "zustand";

export type AuthTransitionContext = "login" | "register";

type AuthTransitionState = {
  active: boolean;
  context: AuthTransitionContext;
  /** Internal token guarding against a stale auto-clear firing after a newer start(). */
  token: number;
  start: (context: AuthTransitionContext) => void;
  stop: () => void;
};

// Safety net: if something goes wrong downstream (e.g. the account page never
// reaches a ready state) the full-screen loader must never get stuck forever
// covering the app. This is intentionally generous — it must never fire
// before a real (if slow) load finishes, e.g. a cold Next.js dev server
// compiling the /account route + its API routes for the first time can
// legitimately take 20-30s. It only exists to prevent an infinite spinner
// if something is genuinely broken, not to cap how long a real load can take.
const AUTO_CLEAR_MS = 45000;

export const useAuthTransitionStore = create<AuthTransitionState>((set, get) => ({
  active: false,
  context: "login",
  token: 0,

  start: (context) => {
    const token = get().token + 1;
    set({ active: true, context, token });
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        if (get().token === token) set({ active: false });
      }, AUTO_CLEAR_MS);
    }
  },

  stop: () => set({ active: false }),
}));
