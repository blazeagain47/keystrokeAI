export type RankTier = "Beginner" | "Skilled" | "Advanced" | "Expert" | "Pro" | "Elite";

export type RankThreshold = {
  minWpm?: number;
  maxWpm?: number;
  minAcc?: number; // percent
  minStreak?: number; // optional, default 0
};

export const RANK_TABLE: Record<RankTier, RankThreshold> = {
  Beginner: { maxWpm: 39, minAcc: 0, minStreak: 0 },
  Skilled: { minWpm: 40, maxWpm: 60, minAcc: 90, minStreak: 0 },
  Advanced: { minWpm: 60, maxWpm: 75, minAcc: 93, minStreak: 0 },
  Expert: { minWpm: 75, maxWpm: 90, minAcc: 95, minStreak: 0 },
  Pro: { minWpm: 90, maxWpm: 110, minAcc: 97, minStreak: 0 },
  Elite: { minWpm: 111, minAcc: 98, minStreak: 0 },
};

export function getRankByPerformance(wpm: number, accPct: number, streak: number): RankTier {
  // Evaluate from highest to lowest to assign the top achievable tier
  const tiers: RankTier[] = ["Elite", "Pro", "Expert", "Advanced", "Skilled", "Beginner"];
  for (const tier of tiers) {
    const t = RANK_TABLE[tier];
    const minWpm = t.minWpm ?? -Infinity;
    const maxWpm = t.maxWpm ?? Infinity;
    const minAcc = t.minAcc ?? 0;
    const minStreak = t.minStreak ?? 0;
    if (wpm >= minWpm && wpm <= maxWpm && accPct >= minAcc && streak >= minStreak) {
      return tier;
    }
  }
  return "Beginner";
}


