"use client";

import Link from "next/link";
import React, { useEffect } from "react";
// ⬇️ Stable lucide icons only
import { User, Settings as Gear, Keyboard } from "lucide-react";
import VersionBadge from "@/components/common/VersionBadge";
import LogoMark from "@/components/brand/LogoMark";
import { useAuthStore } from "@/store/auth";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/stores/useUIStore";
import { BK_EVENTS } from "@/lib/events";

export default function Header() {
  const router = useRouter();
  const { user, hydrateFromMe, logout, ready } = useAuthStore();

  useEffect(() => {
    if (!ready) {
      hydrateFromMe().catch(() => {});
    }
  }, [ready, hydrateFromMe]);

  useEffect(() => {
    console.info("[bk:new] header= src/components/Header.tsx"); // remove after verification
  }, []);

  const openSettings = useUIStore(s => s.openSettings);

  return (
    <header data-app-header className="sticky top-0 z-50 w-full backdrop-blur bg-background/60 border-b border-white/10">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between pr-20 relative">
                    <div className="flex items-center gap-2">
              <LogoMark size={75} />
              <Link href="/" className="font-semibold text-lg tracking-tight">
            <span className="hidden sm:inline bg-[linear-gradient(135deg,#FF3D00,#FF6A00_55%,#FFD36E)] bg-clip-text text-transparent drop-shadow-[0_0_6px_rgba(255,106,0,0.35)]">
              blazeKey
            </span>
          </Link>
        </div>
        <div className="ml-auto flex items-center gap-3 justify-end">
          {/* New test keyboard button (left of settings) */}
          <Link
            href="/#new"
            aria-label="Start a new typing test"
            title="New test (Tab → Enter)"
            className="p-2 rounded-xl hover:bg-white/10 transition"
            onClick={(e) => {
              try { e.preventDefault(); e.stopPropagation(); } catch {}
              try {
                window.dispatchEvent(new Event(BK_EVENTS.NEW_TEST as unknown as string));
                const { pathname, search } = window.location;
                window.history.replaceState(null, "", pathname + search);
              } catch {}
            }}
            data-bk="kbd-newtest"
          >
            <Keyboard className="h-5 w-5" />
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
               {/* absolute version pill pinned to the header's right edge */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex items-center pointer-events-auto">
          <VersionBadge />
        </div>
      {null}
    </header>
  );
}


