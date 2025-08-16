"use client";

import Link from "next/link";
import { useEffect } from "react";
// ⬇️ Stable lucide icons only
import { Bell, User } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import clsx from "clsx";
import { useRouter } from "next/navigation";

export default function Header() {
  const router = useRouter();
  const { user, hydrateFromMe, logout, ready } = useAuthStore();

  useEffect(() => {
    if (!ready) {
      hydrateFromMe().catch(() => {});
    }
  }, [ready, hydrateFromMe]);

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur bg-background/60 border-b border-white/10">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-semibold text-lg tracking-tight">
          KeystrokeAI
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

          <Link
            href={user ? "/account" : "/login"}
            className={clsx(
              "p-2 rounded-xl hover:bg-white/10 transition relative group",
              "focus:outline-none focus:ring-2 focus:ring-white/20"
            )}
            aria-label={user ? "Account" : "Login"}
          >
            {user ? (
              <User className="h-5 w-5" />
            ) : (
              <User className="h-5 w-5 opacity-70" />
            )}
            <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-xs opacity-0 group-hover:opacity-100 transition">
              {user ? user.username : "Sign in"}
            </span>
          </Link>
          {user && (
            <button
              onClick={async () => {
                await logout();
                router.replace("/login");
              }}
              className="px-3 py-1 rounded-xl border border-white/10 hover:bg-white/10 text-sm"
            >
              Sign out
            </button>
          )}
        </div>
      </div>
    </header>
  );
}


