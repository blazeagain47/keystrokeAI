"use client";

import { User } from "@/store/auth";

export default function AccountOverview({ user }: { user: User }) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="col-span-2 rounded-2xl bg-gradient-to-b from-slate-900/50 to-slate-800/40 border border-white/10 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">{user.username}</h1>
            <p className="text-slate-300">{user.email}</p>
          </div>
          <div className="text-right text-sm text-slate-400">
            Joined{" "}
            <span className="text-slate-200">
              {new Date(user.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
      <div className="rounded-2xl bg-slate-900/50 border border-white/10 p-6">
        <div className="text-sm text-slate-400">Notifications</div>
        <div className="mt-2 text-slate-200">Coming soon</div>
      </div>
    </section>
  );
}


