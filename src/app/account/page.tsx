"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { useEffect } from "react";

export default function AccountPage() {
  const { user, loading, hydrateFromMe, logout } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      hydrateFromMe().catch(() => {});
    }
  }, [user, hydrateFromMe]);

  if (loading && !user) {
    return <div className="opacity-70">Loading your account…</div>;
  }
  if (!user) {
    router.replace("/login");
    return null;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6">
        <h1 className="text-xl font-semibold mb-2">{user.username}</h1>
        <p className="text-sm opacity-80">{user.email ?? "No email set"}</p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-black/30 border border-white/10 p-3 text-center">
            <div className="text-2xl font-semibold">{user.xpTotal}</div>
            <div className="text-xs opacity-70">XP</div>
          </div>
          <div className="rounded-xl bg-black/30 border border-white/10 p-3 text-center">
            <div className="text-2xl font-semibold">{user.streak}</div>
            <div className="text-xs opacity-70">Streak</div>
          </div>
          <div className="rounded-xl bg-black/30 border border-white/10 p-3 text-center">
            <div className="text-sm opacity-80">Joined</div>
            <div className="text-xs opacity-70">
              {new Date(user.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Link href="/settings" className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/10">
            Settings
          </Link>
          <Link href="/history" className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/10">
            History
          </Link>
        </div>

        <button
          onClick={async () => {
            await logout();
            router.push("/login");
          }}
          className="mt-6 w-full py-2 rounded-xl bg-white/90 text-black font-medium hover:bg-white"
        >
          Sign out
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6">
        <h2 className="font-semibold mb-2">What’s next</h2>
        <p className="text-sm opacity-80">
          We’ll add OAuth (Google, etc.), richer profiles, and competitive leaderboards.
        </p>
      </div>
    </div>
  );
}


