import { create } from "zustand";
import { fetchJSON } from "@/lib/http";

export type UserProfile = {
  id: number;
  username: string;
  email?: string | null;
  xpTotal: number;
  streak: number;
  createdAt: string;
};

type AuthState = {
  user: UserProfile | null;
  loading: boolean;
  hydrateFromMe: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, email?: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,

  hydrateFromMe: async () => {
    set({ loading: true });
    try {
      const me = await fetchJSON<UserProfile>("/auth/me");
      set({ user: me });
    } catch {
      set({ user: null });
    } finally {
      set({ loading: false });
    }
  },

  login: async (username, password) => {
    set({ loading: true });
    try {
      const me = await fetchJSON<UserProfile>("/auth/login", {
        method: "POST",
        body: { username, password },
      });
      set({ user: me });
    } finally {
      set({ loading: false });
    }
  },

  register: async (username, password, email) => {
    set({ loading: true });
    try {
      const me = await fetchJSON<UserProfile>("/auth/register", {
        method: "POST",
        body: { username, password, email },
      });
      set({ user: me });
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    set({ loading: true });
    try {
      await fetchJSON("/auth/logout", { method: "POST" });
      set({ user: null });
    } finally {
      set({ loading: false });
    }
  },
}));


