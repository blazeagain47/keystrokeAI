"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import AccountOverview from "@/components/account/AccountOverview";
import StatsGrid from "@/components/account/StatsGrid";
import Leaderboard from "@/components/account/Leaderboard";

export default function AccountPage() {
  const router = useRouter();
  const { user, ready, hydrateFromMe } = useAuthStore();

  // hydrate once
  useEffect(() => {
    if (!ready) void hydrateFromMe();
  }, [ready, hydrateFromMe]);

  // redirect only after hydration
  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  // show soft skeleton while hydrating
  if (!ready) {
    return <div className="max-w-6xl mx-auto p-8 text-slate-300">Loading your account…</div>;
  }

  // while redirecting away
  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <AccountOverview user={user} />
      <StatsGrid user={user} />
      <Leaderboard />
    </div>
  );
}


