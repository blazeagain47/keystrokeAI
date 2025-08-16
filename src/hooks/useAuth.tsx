"use client";

import React from "react";
import { useAuthStore } from "@/store/auth";

/**
 * Zustand-backed shim so legacy callers can keep importing `useAuth`.
 * No React Context; no runtime throw. Works even if no provider is mounted.
 */
export function useAuth() {
  const store = useAuthStore();
  return {
    user: store.user,
    loading: store.loading,
    hydrateFromMe: store.hydrateFromMe, // (force?: boolean) => Promise<void>
    // map to store actions for compatibility
    signIn: async (email: string, password: string) => {
      // reuse username field as email-or-username if needed; here assume username
      await store.login(email, password);
    },
    signUp: async (username: string, password: string, email?: string) => {
      await store.register(username, password, email);
    },
    signInWithGoogle: async () => {
      throw new Error("Google sign-in not implemented");
    },
    signOut: async () => {
      await store.logout();
    },
    setUser: undefined,
  };
}

/**
 * No-op provider to remain compatible with existing `<AuthProvider>{children}</AuthProvider>`
 * usages in the tree. Safe to keep or remove later.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}