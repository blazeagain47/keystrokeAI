"use client";
import React from "react";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

type Props = {
  username: string;
  email?: string | null;
  createdAt?: string | null;
};

export default function AccountOverview({ username, email, createdAt }: Props) {
  const initials = (username || "?").slice(0, 2).toUpperCase();
  const { signOut } = useAuth();
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center text-white/90 font-semibold">
          {initials}
        </div>
        <div className="flex-1">
          <div className="text-white/90 font-medium">{username}</div>
          {email ? (
            <div className="text-white/50 text-sm truncate">{email}</div>
          ) : (
            <div className="text-white/40 text-sm">No email</div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-white/50 text-xs">Joined</div>
            <div className="text-white/80 text-sm">{formatDate(createdAt)}</div>
          </div>
          <button
            onClick={async () => {
              await signOut();
              router.replace("/login");
            }}
            className="px-3 py-1 rounded-xl border border-white/10 hover:bg-white/10 text-sm"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
        <div className="text-white/60 text-sm">Notifications</div>
        <div className="text-white/80">Coming soon</div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-4">
        <div className="text-white/60 text-sm">Tips</div>
        <div className="text-white/80">Practice daily to extend your streak.</div>
      </div>
    </div>
  );
}



