"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle2, AlertCircle } from "lucide-react";

type UserLite = { username: string; email?: string | null; createdAt?: string | number | Date };
type Props = { user: UserLite | null; onSignOut: () => Promise<void> | void; className?: string };

export default function ProfileHeader({ user, onSignOut, className = "" }: Props) {
  const username = user?.username || "Guest";
  const initials = (username || "?").slice(0, 2).toUpperCase();
  const email = user?.email ?? null;
  const isAuthed = Boolean(user);
  const isVerified = !!(user as any)?.emailVerified;
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className={`bk-fire-card bk-card-sheen p-5 md:p-6 ${className}`}>
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14 ring-2 ring-orange-500/25 shrink-0">
          <AvatarImage src={undefined as any} alt={username} />
          <AvatarFallback className="text-lg bg-gradient-to-br from-[#FF3D00] via-[#FF6A00] to-[#FFB066] text-white">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg font-semibold text-white leading-tight truncate">{username}</span>
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
          <div className="mt-1 flex items-center gap-2 text-sm text-white/40 min-w-0">
            <span className="truncate">{email || "No email on file"}</span>
            {memberSince && (
              <>
                <span className="text-white/20 shrink-0">•</span>
                <span className="shrink-0 whitespace-nowrap">Member since {memberSince}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isAuthed ? (
            <button
              onClick={() => void onSignOut()}
              aria-label="Sign out"
              className="px-3 py-1.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/5 transition-colors"
            >
              Sign out
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <a href="/login#login" aria-label="Sign in" className="px-3 py-1.5 rounded-xl bg-white text-black text-sm font-medium">
                Sign in
              </a>
              <a
                href="/login#register"
                aria-label="Register"
                className="px-3 py-1.5 rounded-xl border border-white/10 text-white/90 text-sm hover:bg-white/10"
              >
                Register
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
