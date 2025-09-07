// src/lib/leaderboardUser.ts
export function leaderboardDocId(params: { uid?: string | null; username?: string | null }) {
  const uid = params.uid?.trim();
  const uname = params.username?.trim();
  if (uid) return uid;
  if (!uname) throw new Error("leaderboardDocId: missing uid/username");
  return uname.toLowerCase(); // usernameLower as doc id
}
