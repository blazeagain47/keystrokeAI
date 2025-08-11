// src/utils/progression.ts
export type RankKey = "novice" | "apprentice" | "pro" | "master" | "legend";

export function xpForRun(wpm: number, accuracyPct: number) {
  // Reward both speed and accuracy; cap accuracy to 100.
  const acc = Math.max(0, Math.min(100, accuracyPct));
  // Scale softly so runs give ~10–120 XP typically.
  return Math.round((wpm * (0.6 + (acc / 100) * 0.4)));
}

export function rankForXP(xp: number): { rank: RankKey; nextAt: number; label: string } {
  const bands: Array<{ at: number; key: RankKey; label: string }> = [
    { at: 0, key: "novice", label: "Novice" },
    { at: 500, key: "apprentice", label: "Apprentice" },
    { at: 2000, key: "pro", label: "Pro" },
    { at: 6000, key: "master", label: "Master" },
    { at: 15000, key: "legend", label: "Legend" },
  ];
  let current = bands[0], next = bands[bands.length - 1];
  for (let i = 0; i < bands.length; i++) {
    if (xp >= bands[i].at) current = bands[i];
    if (xp < bands[i].at) { next = bands[i]; break; }
  }
  return { rank: current.key, nextAt: next.at, label: current.label };
}

export function formatProgress(xp: number, nextAt: number) {
  const delta = Math.max(0, nextAt - xp);
  return { remaining: delta, pct: Math.min(100, Math.round(((xp - (nextAt - delta)) / Math.max(1, nextAt)) * 100)) };
}

export const xpStore = {
  read(): number {
    if (typeof window === "undefined") return 0;
    const raw = localStorage.getItem("ks_xp");
    return raw ? parseInt(raw, 10) || 0 : 0;
  },
  write(xp: number) {
    try { localStorage.setItem("ks_xp", String(Math.max(0, Math.floor(xp)))); } catch {}
  },
  bump(amount: number) { const cur = this.read(); this.write(cur + amount); return cur + amount; }
};

export const streakStore = {
  read(): number {
    if (typeof window === "undefined") return 0;
    const raw = localStorage.getItem("ks_streak");
    return raw ? parseInt(raw, 10) || 0 : 0;
  },
  write(v: number) { try { localStorage.setItem("ks_streak", String(Math.max(0, Math.floor(v)))); } catch {} },
  inc() { const cur = this.read() + 1; this.write(cur); return cur; },
  reset() { this.write(0); return 0; },
};


