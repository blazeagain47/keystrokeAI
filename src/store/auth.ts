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
  firebaseUid?: string | null;
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
      const raw = await fetchJSON<any>("/api/auth/me");
      const prev = get().user;
      const me: User | null = raw ? normalizeUser(raw, prev) : null;
      set({ user: me, error: null });
      try { const { pingStreak } = await import("@/lib/streakClient"); await pingStreak(); } catch {}
      // We intentionally do NOT sign into Firebase anonymously anymore.
      // This prevented guest "player" rows from being added to the leaderboard.
    } catch (err: any) {
      set({ user: null, error: err?.message || "Not authenticated" });
    } finally {
      set({ loading: false, ready: true });
    }
  },

  login: async (username, password) => {
    set({ error: null, loading: true });
    try {
      const raw = await fetchJSON<any>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      } as any);
      const user = normalizeUser(raw, get().user);
      set({ user, ready: true });
      try {
        await fetch("/api/profile/sync", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ username: user.username }),
        });
      } catch {}
      try { const { pingStreak } = await import("@/lib/streakClient"); await pingStreak(); } catch {}
    } catch (err: any) {
      set({ error: err?.message || "Login failed" });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  register: async (username, password, email) => {
    set({ error: null, loading: true });
    try {
      const raw = await fetchJSON<any>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ username, password, email }),
      } as any);
      const user = normalizeUser(raw, get().user);
      set({ user, ready: true });
      try {
        await fetch("/api/profile/sync", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ username: user.username }),
        });
      } catch {}
      try { const { pingStreak } = await import("@/lib/streakClient"); await pingStreak(); } catch {}
    } catch (err: any) {
      set({ error: err?.message || "Registration failed" });
      throw err;
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

// Accept multiple upstream shapes and preserve previous xpTotal/streak if missing.
function normalizeUser(raw: any, prev?: User | null): User {
  const id = raw?.id ?? raw?.user_id ?? raw?.uid ?? 0;
  const username = raw?.username ?? raw?.name ?? raw?.handle ?? "user";
  const email = raw?.email ?? raw?.mail ?? null;
  const createdAt = raw?.createdAt ?? raw?.created_at ?? raw?.joined_at ?? new Date().toISOString();
  const xpTotal =
    (raw?.xpTotal ?? raw?.totalXP ?? raw?.xp ?? raw?.total_xp ?? raw?.xp_total) ??
    (prev?.xpTotal ?? 0);
  const streak =
    (raw?.streak ?? raw?.streak_days ?? raw?.current_streak) ??
    (prev?.streak ?? 0);
  return { id, username, email, xpTotal: Number(xpTotal) || 0, streak: Number(streak) || 0, createdAt };
}


