"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import AccountOverview from "@/components/account/AccountOverview";
import StatsGrid from "@/components/account/StatsGrid";
import Leaderboard from "@/components/account/Leaderboard";
import BlazeHistoryPanel from "@/components/account/BlazeHistoryPanel";
import CommandHints from "@/components/account/CommandHints";
import { useStatsStore } from "@/stores/useStatsStore";

export default function AccountPage() {
  const { user, loading, hydrateFromMe } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const hydrateStats = useStatsStore(s => s.hydrate);

  // hydrate once (force to ensure fresh XP/stats on account load)
  useEffect(() => {
    const force = true;
    if (!loading) hydrateFromMe(force);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // hydrate stats store once user is available
  useEffect(() => {
    if (!user) return;
    try { void hydrateStats(String(user.id)); } catch {}
  }, [user, hydrateStats]);

  // redirect only after hydration
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  // show soft skeleton while hydrating
  if (loading) {
    return <div className="max-w-6xl mx-auto p-8 text-slate-300">Loading your account…</div>;
  }

  // while redirecting away
  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <CommandHints />
      <AccountOverview username={user.username} email={user.email} createdAt={user.createdAt} />
      <StatsGrid totalXP={user.xpTotal ?? 0} streak={user.streak ?? 0} memberSince={new Date(user.createdAt).toLocaleDateString()} />
      <BlazeHistoryPanel />
      <Leaderboard />
    </div>
  );
}


