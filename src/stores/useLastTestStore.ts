"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type LastTestConfig = {
  mode: "words" | "time" | "quote" | "custom";
  wordCount?: number | null;
  durationSec?: number | null;
  include_numbers?: boolean;
  include_punctuation?: boolean;
  ts?: number;
};

type LastTestState = {
  last: LastTestConfig | null;
  save: (cfg: LastTestConfig) => void;
  clear: () => void;
};

export const useLastTestStore = create<LastTestState>()(
  persist(
    (set) => ({
      last: null,
      save: (cfg) => set({ last: { ...cfg, ts: Date.now() } }),
      clear: () => set({ last: null }),
    }),
    { name: "bk:lastTest:v1", version: 1 }
  )
);

/** Fallback reader for hydration race: read directly from localStorage if needed. */
export function readLastTestSafe(): LastTestConfig | null {
  try {
    const raw = localStorage.getItem("bk:lastTest:v1");
    if (!raw) return null;
    const obj = JSON.parse(raw);
    // zustand/persist stores { state: { last: ... }, version: n }
    return obj?.state?.last ?? null;
  } catch {
    return null;
  }
}


