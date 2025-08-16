"use client";

import { User } from "@/store/auth";

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-slate-900/50 border border-white/10 p-5">
      <div className="text-xs uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}

export default function StatsGrid({ user }: { user: User }) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Tile label="Total XP" value={user.xpTotal} />
      <Tile label="Current Streak" value={user.streak} />
      <Tile
        label="Member Since"
        value={new Date(user.createdAt).toLocaleDateString()}
      />
    </section>
  );
}


