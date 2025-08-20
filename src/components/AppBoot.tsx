"use client";
import React, { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/auth";
import { useAppearance } from "@/hooks/useAppearance";
import { useStatsStore } from "@/stores/useStatsStore";

export default function AppBoot() {
  const ran = useRef(false);
  useAppearance();
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    try {
      const { ready, hydrateFromMe } = useAuthStore.getState();
      if (!ready) hydrateFromMe().catch(() => {});
    } catch {}
  }, []);

  // Hydrate stats store when user identity changes (guest vs authed)
  const uid = useAuthStore(s => s.user?.id);
  useEffect(() => {
    const id = uid ? String(uid) : "guest";
    try { useStatsStore.getState().hydrate(id); } catch {}
  }, [uid]);
  return null;
}


