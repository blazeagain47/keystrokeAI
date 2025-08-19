"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type UserLite = { username: string; email?: string | null; createdAt?: string | number | Date };
type Props = { user: UserLite | null; onSignOut: () => Promise<void> | void; className?: string };

export default function ProfileSummaryCard({ user, onSignOut, className = "" }: Props) {
  const username = user?.username || "Guest";
  const initials = (username || "?").slice(0, 2).toUpperCase();
  const email = user?.email ?? null;
  const joined = user?.createdAt ? new Date(user.createdAt) : null;
  const joinedText = joined ? joined.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";

  const isAuthed = Boolean(user);

  return (
    <Card className={`rounded-2xl border border-white/10 bg-gray-900/40 backdrop-blur-md hover:shadow-[0_0_30px_rgba(255,110,0,.15)] transition-shadow ${className}`}>
      <CardContent className="p-4 md:p-5">
        <div className="flex items-center gap-4">
          <Avatar aria-label={username}>
            <AvatarImage src={undefined as any} alt={username} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-base font-semibold text-white truncate">{username}</div>
            <div className="text-sm text-white/70 truncate">{email || "No email"}</div>
          </div>
          <div className="hidden sm:flex items-center gap-4">
            <div className="text-right">
              <div className="text-white/60 text-xs">Joined</div>
              <div className="text-white/80 text-sm">{joinedText}</div>
            </div>
            {isAuthed ? (
              <button onClick={() => void onSignOut()} aria-label="Sign out" className="px-3 py-1 rounded-xl border border-white/10 hover:bg-white/10 text-sm">
                Sign out
              </button>
            ) : null}
          </div>
        </div>
        <div className="mt-4 sm:hidden flex items-center justify-between">
          <div className="text-white/60 text-xs">Joined</div>
          <div className="text-white/80 text-sm">{joinedText}</div>
        </div>
        {!isAuthed && (
          <div className="mt-4 flex items-center gap-2">
            <a href="/login#login" aria-label="Sign in" className="px-3 py-1.5 rounded-xl bg-white text-black text-sm font-medium">Sign in</a>
            <a href="/login#register" aria-label="Register" className="px-3 py-1.5 rounded-xl border border-white/10 text-white/90 text-sm hover:bg-white/10">Register</a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
