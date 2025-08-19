import { BlazeRun } from "@/lib/historyLocal";

export type Achievement = {
  id: string;
  title: string;
  desc: string;
  icon: string; // lucide icon name
  unlockedAt: number | null;
  progress?: number; // 0..1
  meta?: Record<string, any>;
};

export type AchievementsBundle = {
  list: Achievement[];
  level: number;
  nextLevelAt: number;
  totalXp: number;
};

function clamp01(x: number): number { return Math.max(0, Math.min(1, x)); }

function bestStreakDays(runs: BlazeRun[]): { best: number; reachedAt: number | null } {
  // compute max consecutive days based on run timestamps
  const days = Array.from(new Set(runs.map(r => new Date(new Date(r.ts).toDateString()).getTime()))).sort((a,b)=>a-b);
  let best = 0; let cur = 0; let prev: number | null = null; let reachedAt: number | null = null;
  for (const d of days) {
    if (prev != null && d - prev === 24*3600*1000) cur += 1; else cur = 1;
    if (cur > best) { best = cur; reachedAt = d; }
    prev = d;
  }
  return { best, reachedAt };
}

function firstCrossingTs(runs: BlazeRun[], predicate: (r: BlazeRun) => boolean): number | null {
  const asc = [...runs].sort((a,b)=>a.ts-b.ts);
  for (const r of asc) if (predicate(r)) return r.ts;
  return null;
}

export function computeAchievements(runs: BlazeRun[], totalXp: number, joinedAt?: number | string | Date): AchievementsBundle {
  const xp = Math.max(0, Number(totalXp) || 0);
  const level = Math.floor(xp / 100) + 1;
  const nextLevelAt = 100;

  const sessions = runs.length;
  const maxWpm = runs.reduce((m, r) => Math.max(m, Number(r.wpm) || 0), 0);
  const maxAcc = runs.reduce((m, r) => Math.max(m, Number(r.acc) || 0), 0);
  const { best: bestStreak, reachedAt: streakReachedAt } = bestStreakDays(runs);

  const joinedTs = joinedAt ? new Date(joinedAt as any).getTime() : null;
  const oneDayMs = 24*3600*1000;
  const ageMs = joinedTs ? Date.now() - joinedTs : 0;

  const list: Achievement[] = [];

  // First Blaze
  list.push({
    id: "first_blaze",
    title: "First Blaze",
    desc: "Complete your first session",
    icon: "Sparkles",
    unlockedAt: sessions >= 1 ? (runs.reduce((t, r) => Math.min(t, r.ts), Infinity) || Date.now()) : null,
    progress: clamp01(sessions / 1),
  });

  // Hot Streaks
  const streakRules: Array<{ id: string; title: string; th: number }> = [
    { id: "streak_3", title: "Hot Streak I", th: 3 },
    { id: "streak_7", title: "Hot Streak II", th: 7 },
    { id: "streak_30", title: "Hot Streak III", th: 30 },
  ];
  for (const s of streakRules) {
    list.push({
      id: s.id,
      title: s.title,
      desc: `Maintain a ${s.th}-day streak`,
      icon: "Flame",
      unlockedAt: bestStreak >= s.th ? (streakReachedAt ? streakReachedAt : Date.now()) : null,
      progress: clamp01(bestStreak / s.th),
      meta: { bestStreak },
    });
  }

  // Speedster
  const speedRules: Array<{ id: string; title: string; th: number }> = [
    { id: "speed_60", title: "Speedster I", th: 60 },
    { id: "speed_80", title: "Speedster II", th: 80 },
    { id: "speed_100", title: "Speedster III", th: 100 },
  ];
  for (const s of speedRules) {
    list.push({
      id: s.id,
      title: s.title,
      desc: `Reach ${s.th} WPM in a session`,
      icon: "Zap",
      unlockedAt: maxWpm >= s.th ? firstCrossingTs(runs, r => r.wpm >= s.th) : null,
      progress: clamp01(maxWpm / s.th),
      meta: { maxWpm },
    });
  }

  // Accuracy Ace
  list.push({
    id: "acc_95",
    title: "Accuracy Ace",
    desc: "Hit 95% accuracy in a session",
    icon: "Target",
    unlockedAt: maxAcc >= 95 ? firstCrossingTs(runs, r => r.acc >= 95) : null,
    progress: clamp01(maxAcc / 95),
    meta: { maxAcc },
  });

  // Marathoner
  const sessRules: Array<{ id: string; title: string; th: number }> = [
    { id: "sessions_50", title: "Marathoner I", th: 50 },
    { id: "sessions_200", title: "Marathoner II", th: 200 },
  ];
  for (const s of sessRules) {
    list.push({
      id: s.id,
      title: s.title,
      desc: `Complete ${s.th} sessions in total`,
      icon: "Trophy",
      unlockedAt: sessions >= s.th ? firstCrossingTs(runs.sort((a,b)=>a.ts-b.ts).map((r, i) => ({...r, _n: i+1})) as any, (r: any) => r._n >= s.th) : null,
      progress: clamp01(sessions / s.th),
      meta: { sessions },
    });
  }

  // Fresh Start
  list.push({
    id: "fresh_start",
    title: "Fresh Start",
    desc: "Come back the next day after joining",
    icon: "CalendarDays",
    unlockedAt: joinedTs && ageMs >= oneDayMs ? joinedTs : null,
    progress: joinedTs ? clamp01(ageMs / oneDayMs) : 0,
  });

  return { list, level, nextLevelAt, totalXp: xp };
}


