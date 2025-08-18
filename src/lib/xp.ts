export type XpAward = {
  base: number;
  bonus: number;
  total: number;
  reason?: string;
};

const BASE_XP = 10;
const BONUS_95_ACC = 40;

export function parseChallengeBonusText(text?: string | null): { needs95Acc: boolean } {
  const t = (text || "").toLowerCase();
  return { needs95Acc: /95%.*accuracy/.test(t) || /≥95%.*accuracy/.test(t) };
}

export function computeXpAward(accPct: number, challengeText?: string | null): XpAward {
  const base = BASE_XP;
  const { needs95Acc } = parseChallengeBonusText(challengeText);
  const bonus = needs95Acc && accPct >= 95 ? BONUS_95_ACC : 0;
  return { base, bonus, total: base + bonus, reason: bonus ? "≥95% accuracy" : undefined };
}

export const XP_MAX = 10000;


