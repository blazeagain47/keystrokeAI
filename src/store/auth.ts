"use client";

import { create } from "zustand";
import { fetchJSON } from "@/lib/http";

export type User = {
  id: number;
  username: string;
  email?: string | null;
  xpTotal: number;
  streak: number;
  createdAt: string;
};

type AuthState = {
  user: User | null;
  ready: boolean;
  error: string | null;
  loading: boolean;

  hydrateFromMe: (force?: boolean) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, email?: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  ready: false,
  error: null,
  loading: false,

  /** Hydrate auth state from /api/auth/me. Pass force=true to re-run even if ready. */
  hydrateFromMe: async (force?: boolean) => {
    if (get().loading) return;
    if (get().ready && !force) return;
    set({ loading: true });
    try {
      const me = await fetchJSON<User>("/api/auth/me");
      set({ user: me || null, error: null });
    } catch (err: any) {
      set({ user: null, error: err?.message || "Not authenticated" });
    } finally {
      set({ loading: false, ready: true });
    }
  },

  login: async (username, password) => {
    set({ error: null, loading: true });
    try {
      const me = await fetchJSON<User>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      } as any);
      set({ user: me, ready: true });
    } finally {
      set({ loading: false });
    }
  },

  register: async (username, password, email) => {
    set({ error: null, loading: true });
    try {
      const me = await fetchJSON<User>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ username, password, email }),
      } as any);
      set({ user: me, ready: true });
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "content-type": "application/json" },
      }).catch(() => {});
    } finally {
      // Clear client state regardless of server response
      set({ user: null, ready: true, loading: false, error: null });
    }
  },
}));


