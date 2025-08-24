export type LeaderboardRow = { id: string | number; username?: string; xpTotal: number; avatarUrl?: string | null };

export async function fetchLeaderboard(limit = 10): Promise<LeaderboardRow[]> {
  const res = await fetch(`/api/leaderboard?limit=${limit}`, { cache: "no-store", credentials: "include" });
  if (!res.ok) throw new Error(`leaderboard_failed:${res.status}`);
  const data = await res.json();
  return Array.isArray(data?.rows) ? data.rows : [];
}

export async function fetchUsernames(ids: string[]): Promise<Record<string, { username: string; avatarUrl?: string | null }>> {
  if (!ids.length) return {};
  const res = await fetch(`/api/users/usernames?ids=${encodeURIComponent(ids.join(","))}`, { cache: "no-store" });
  if (!res.ok) return {};
  const json = await res.json().catch(() => ({}));
  return json?.map || {};
}


