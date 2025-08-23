"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle2, AlertCircle } from "lucide-react";

type UserLite = { username: string; email?: string | null; createdAt?: string | number | Date };
type Props = { user: UserLite | null; onSignOut: () => Promise<void> | void; className?: string };

export default function ProfileSummaryCard({ user, onSignOut, className = "" }: Props) {
  const username = user?.username || "Guest";
  const initials = (username || "?").slice(0, 2).toUpperCase();
  const email = user?.email ?? null;
  const isAuthed = Boolean(user);
  const isVerified = !!(user as any)?.emailVerified;

  return (
    <Card className={`rounded-2xl border border-white/10 bg-gray-900/40 backdrop-blur-md hover:shadow-[0_0_30px_rgba(255,110,0,.15)] transition-shadow ${className}`}>
      <CardContent className="p-4 md:p-5">
        <div className="flex items-center gap-4">
          <Avatar aria-label={username}>
            <AvatarImage src={undefined as any} alt={username} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-base font-semibold text-white leading-tight break-words whitespace-normal">{username}</div>
            <div className="text-sm text-white/70 mt-0.5 break-all flex items-center gap-2">
              <span>{email || "No email on file"}</span>
              {email && (
                <span
                  className={
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ring-1 " +
                    (isVerified
                      ? "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20"
                      : "bg-amber-500/10 text-amber-300 ring-amber-400/20")
                  }
                  title={isVerified ? "Email verified" : "Email not verified"}
                >
                  {isVerified ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                  {isVerified ? "Verified" : "Unverified"}
                </span>
              )}
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-4">
            {isAuthed ? (
              <button onClick={() => void onSignOut()} aria-label="Sign out" className="px-3 py-1 rounded-xl border border-white/10 hover:bg-white/10 text-sm">
                Sign out
              </button>
            ) : null}
          </div>
        </div>
        {/* Joined removed here; Member Since lives in the middle card */}
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
