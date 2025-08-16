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

  hydrateFromMe: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, email?: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  ready: false,
  error: null,
  loading: false,

  hydrateFromMe: async () => {
    set({ loading: true });
    try {
      const me = await fetchJSON<User>("/api/auth/me");
      set({ user: me, error: null, ready: true });
    } catch (err: any) {
      set({ user: null, error: err?.message ?? "not_authenticated", ready: true });
    } finally {
      set({ loading: false });
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
    set({ loading: true });
    try {
      await fetchJSON("/api/auth/logout", { method: "POST" } as any);
    } catch {}
    set({ user: null, ready: true, loading: false });
  },
}));


