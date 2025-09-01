// src/lib/wordbanks/index.ts
// If EN_CORE_5K already exists, use it; otherwise fall back to the current main bank.
import { EN_CORE_5K } from "./en_core_5k"; // <-- this should already exist (5k+ words)

export const EN_CORE_200  = EN_CORE_5K.slice(0, 200);
export const EN_CORE_1000 = EN_CORE_5K.slice(0, 1000);

export type WordSetKey = "core200" | "core1000" | "core5000";

export function getWordset(key: WordSetKey): string[] {
  switch (key) {
    case "core200":  return EN_CORE_200;
    case "core1000": return EN_CORE_1000;
    default:         return EN_CORE_5K; // "core5000"
  }
}
