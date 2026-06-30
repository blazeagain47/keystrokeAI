"use client";

import { useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import ProfileHeader from "@/components/account/ProfileHeader";
import StatsOverview from "@/components/account/StatsOverview";
import RecentSessionsTable from "@/components/account/RecentSessionsTable";
import LeaderboardCTA from "@/components/account/LeaderboardCTA";
import CommandHints from "@/components/account/CommandHints";
import { useStatsStore } from "@/stores/useStatsStore";
import { useAuthTransitionStore } from "@/store/authTransition";
import AdSlot from "@/components/ads/AdSlot";
import { syncProfileUsername } from "@/lib/profileApi";

export default function AccountPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, ready, loading, hydrateFromMe } = useAuthStore();
  const hydrateStats = useStatsStore(s => s.hydrate);
  const history = useStatsStore(s => s.history);

  // hydrate auth store once
  useEffect(() => {
    if (!ready) { void hydrateFromMe(); }
  }, [ready, hydrateFromMe]);

  // mirror username to Firestore for leaderboard labels (best-effort)
  useEffect(() => {
    if (!ready) return;
    try {
      const u = useAuthStore.getState().user;
      if (u?.username) void syncProfileUsername(String(u.username));
    } catch {}
  }, [ready]);

  // hydrate stats store once user is available
  useEffect(() => {
    if (!user) return;
    try { void hydrateStats(String(user.id)); } catch {}
  }, [user, hydrateStats]);

  // Clear the post-login/register full-screen loader (started on /login)
  // once the account is actually ready to render, so the transition from
  // pressing the button to seeing the account page reads as one load.
  useEffect(() => {
    if (ready && user) useAuthTransitionStore.getState().stop();
  }, [ready, user]);

  // redirect only after hydration
  useEffect(() => {
    if (ready && !user) {
      const qs = searchParams.toString();
      const next = encodeURIComponent(`${pathname}${qs ? `?${qs}` : ""}`);
      router.replace(`/login?next=${next}`);
    }
  }, [ready, user, pathname, searchParams, router]);

  // show soft skeleton while hydrating
  if (!ready || loading) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="bk-fire-card p-6 animate-pulse h-[88px]" />
        <div className="bk-fire-card grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-white/10 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-6 h-[84px]" />
          ))}
        </div>
      </div>
    );
  }

  // while redirecting away
  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <CommandHints />

      <ProfileHeader
        user={user}
        onSignOut={async () => {
          try { await (await import("@/hooks/useAuth")).useAuth().signOut(); } catch {}
          try {
            const qs = searchParams.toString();
            const next = encodeURIComponent(`${pathname}${qs ? `?${qs}` : ""}`);
            router.replace(`/login?next=${next}`);
          } catch {}
        }}
      />

      <StatsOverview />

      <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_STATS} pageKey="stats" />

      <RecentSessionsTable rows={history || []} />

      <LeaderboardCTA />
    </div>
  );
}


