"use client";

import { useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import ProfileSummaryCard from "@/components/account/AccountOverview";
import Leaderboard from "@/components/account/Leaderboard";
import BlazeHistoryPanel from "@/components/account/BlazeHistoryPanel";
import CommandHints from "@/components/account/CommandHints";
import { useStatsStore } from "@/stores/useStatsStore";
import NotificationsCard from "@/components/account/NotificationsCard";
import TipsCard from "@/components/account/TipsCard";
import { Card, CardContent } from "@/components/ui/card";
import AchievementsGrid from "@/components/account/AchievementsGrid";
import { computeAchievements } from "@/lib/achievements";

export default function AccountPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, ready, loading, hydrateFromMe } = useAuthStore();
  const hydrateStats = useStatsStore(s => s.hydrate);

  // hydrate auth store once
  useEffect(() => {
    if (!ready) { void hydrateFromMe(); }
  }, [ready, hydrateFromMe]);

  // hydrate stats store once user is available
  useEffect(() => {
    if (!user) return;
    try { void hydrateStats(String(user.id)); } catch {}
  }, [user, hydrateStats]);

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
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-5 animate-pulse h-[96px]" />
          ))}
        </div>
      </div>
    );
  }

  // while redirecting away
  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <CommandHints />
      <div className="grid gap-6 md:grid-cols-3">
        <ProfileSummaryCard
          className="md:col-span-1"
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
        <NotificationsCard className="md:col-span-1" />
        <TipsCard className="md:col-span-1" />
      </div>

      {/* Achievements */}
      {(() => {
        try {
          const totalXp = useStatsStore.getState().totalXP || 0;
          const runs = (useStatsStore.getState().history || []) as any as import("@/lib/historyLocal").BlazeRun[];
          const bundle = computeAchievements(runs, totalXp, user.createdAt);
          return <AchievementsGrid bundle={bundle} />;
        } catch { return null; }
      })()}

      {user ? (
        <>
          {/* Duplicate stats row removed in favor of the Blaze history section below */}
          <BlazeHistoryPanel />
          <Leaderboard />
        </>
      ) : (
        <Card className="rounded-2xl border border-white/10 bg-gray-900/40 backdrop-blur-md hover:shadow-[0_0_30px_rgba(255,110,0,.15)] transition-shadow">
          <CardContent className="p-5">
            <div className="text-base font-semibold text-white mb-1">Save your BlazeStats</div>
            <div className="text-white/70 mb-3">Create an account to track XP, streaks, and history across devices.</div>
            <div className="flex items-center gap-2">
              <a href="/login#login" className="px-3 py-1.5 rounded-xl bg-white text-black text-sm font-medium">Sign in</a>
              <a href="/login#register" className="px-3 py-1.5 rounded-xl border border-white/10 text-white/90 text-sm hover:bg-white/10">Register</a>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


