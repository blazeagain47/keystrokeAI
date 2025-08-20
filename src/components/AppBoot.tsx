"use client";
import React, { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/auth";
import { useAppearance } from "@/hooks/useAppearance";

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
  return null;
}


