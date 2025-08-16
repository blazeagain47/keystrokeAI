"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import AccountOverview from "@/components/account/AccountOverview";
import StatsGrid from "@/components/account/StatsGrid";
import Leaderboard from "@/components/account/Leaderboard";

export default function AccountPage() {
  const { user, loading, hydrateFromMe } = useAuth();
  const router = useRouter();
  const params = useSearchParams();

  // hydrate once
  useEffect(() => {
    // Always hydrate once on mount.
    // In dev or when ?debug=me is present, force hydration so you can see /api/auth/me in the Network panel.
    const force = process.env.NODE_ENV === "development" || params.get("debug") === "me";
    if (!loading) hydrateFromMe(force);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <AccountOverview username={user.username} email={user.email} createdAt={user.createdAt} />
      <StatsGrid totalXP={user.xpTotal ?? 0} streak={user.streak ?? 0} memberSince={new Date(user.createdAt).toLocaleDateString()} />
      <Leaderboard />
    </div>
  );
}


