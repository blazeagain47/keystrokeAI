"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
// ⬇️ Stable lucide icons only
import { Bell, User, Settings as Gear } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/stores/useUIStore";

export default function Header() {
  const router = useRouter();
  const { user, hydrateFromMe, logout, ready } = useAuthStore();

  useEffect(() => {
    if (!ready) {
      hydrateFromMe().catch(() => {});
    }
  }, [ready, hydrateFromMe]);

  const openSettings = useUIStore(s => s.openSettings);

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur bg-background/60 border-b border-white/10">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-semibold text-lg tracking-tight">
          <span className="bg-[linear-gradient(135deg,#FF3D00,#FF6A00_55%,#FFD36E)] bg-clip-text text-transparent drop-shadow-[0_0_6px_rgba(255,106,0,0.35)]">
            blazeKey
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="#"
            className="p-2 rounded-xl hover:bg-white/10 transition"
            aria-label="Notifications"
            onClick={(e) => e.preventDefault()}
          >
            <Bell className="h-5 w-5" />
          </Link>

          <button
            onClick={openSettings}
            className="p-2 rounded-xl hover:bg-white/10 transition"
            aria-label="Settings"
          >
            <Gear className="h-5 w-5" />
          </button>

          {user ? (
            <>
              <Link
                href="/account"
                className={clsx(
                  "p-2 rounded-xl hover:bg-white/10 transition relative group",
                  "focus:outline-none focus:ring-2 focus:ring-white/20"
                )}
                aria-label="Account"
              >
                <User className="h-5 w-5" />
                <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-xs opacity-0 group-hover:opacity-100 transition">
                  {user.username}
                </span>
              </Link>
              <button
                onClick={async () => {
                  await logout();
                  const next = encodeURIComponent("/account");
                  router.replace(`/login?next=${next}`);
                }}
                className="px-3 py-1 rounded-xl border border-white/10 hover:bg-white/10 text-sm"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={clsx(
                  "px-3 py-1 rounded-xl border border-white/10 hover:bg-white/10 text-sm"
                )}
                aria-label="Sign in"
              >
                Sign in
              </Link>
              <Link
                href="/login#register"
                className={clsx(
                  "px-3 py-1 rounded-xl bg-white text-black text-sm font-medium"
                )}
                aria-label="Register"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
      {null}
    </header>
  );
}


