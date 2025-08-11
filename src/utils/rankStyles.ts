export type RankTier = "Beginner" | "Skilled" | "Advanced" | "Expert" | "Pro" | "Elite";

export const rankStyles: Record<RankTier, { start: string; end: string; glow: string }> = {
  Beginner: { start: "#4B5563", end: "#9CA3AF", glow: "rgba(156, 163, 175, 0.8)" },
  Skilled:  { start: "#2563EB", end: "#3B82F6", glow: "rgba(59, 130, 246, 0.8)" },
  Advanced: { start: "#7C3AED", end: "#A855F7", glow: "rgba(168, 85, 247, 0.8)" },
  Expert:   { start: "#F97316", end: "#FB923C", glow: "rgba(251, 146, 60, 0.8)" },
  Pro:      { start: "#FACC15", end: "#FDE047", glow: "rgba(253, 224, 71, 0.8)" },
  Elite:    { start: "#D946EF", end: "#EC4899", glow: "rgba(236, 72, 153, 0.8)" },
};

export function mapToRankTier(label: string | undefined | null): RankTier {
  const l = (label || "").toLowerCase();
  if (l.includes("elite") || l.includes("legend")) return "Elite";
  if (l.includes("pro")) return "Pro";
  if (l.includes("expert") || l.includes("master")) return "Expert";
  if (l.includes("advanced")) return "Advanced";
  if (l.includes("skilled") || l.includes("apprentice")) return "Skilled";
  return "Beginner";
}

export function shouldShimmer(tier: RankTier): boolean {
  return tier === "Pro" || tier === "Elite";
}


