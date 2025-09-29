"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";

export default function LoginPage() {
  // Start on "login"; we'll sync from URL right after mount to avoid SSR mismatch.
  const [tab, setTab] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const { login, register, loading } = useAuthStore();
  const router = useRouter();

  const [err, setErr] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Read desired tab from URL on mount and when URL changes (hash/popstate).
  useEffect(() => {
    const applyFromUrl = () => {
      try {
        const hash = (window.location.hash || "").replace(/^#/, "").toLowerCase();
        const q = new URLSearchParams(window.location.search).get("tab")?.toLowerCase() || "";
        const wantsRegister = hash === "register" || hash === "signup" || q === "register" || q === "signup";
        const wantsLogin = hash === "login" || q === "login";
        setTab(wantsRegister ? "register" : wantsLogin ? "login" : "login");
      } catch {
        setTab("login");
      }
    };
    applyFromUrl();
    window.addEventListener("hashchange", applyFromUrl);
    window.addEventListener("popstate", applyFromUrl);
    return () => {
      window.removeEventListener("hashchange", applyFromUrl);
      window.removeEventListener("popstate", applyFromUrl);
    };
  }, []);

  const [submitting, setSubmitting] = useState(false);
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErr(null);
    setSubmitting(true);
    // ==== TEMP LOGS: remove after diagnosis ====
    try {
      console.log('[auth] submit:start', {
        method: 'POST',
        url: '/api/auth/login',
        credentialsMode: 'include',
        headersSent: { 'content-type': 'application/json', authorization: 'absent' },
        bodyKeys: ['username','password'],
      });
    } catch {}
    try {
      if (tab === "login") {
        await login(username, password);
      } else {
        await register(username, password, email || undefined);
      }
      router.replace("/account");
    } catch (error: any) {
      // ==== TEMP LOGS: remove after diagnosis ====
      try { console.error('[auth] submit:error', error?.message, error); } catch {}
      setErr(error?.message || "Authentication failed");
    } finally { setSubmitting(false); }
  };

  if (!mounted) return null;

  return (
    <Suspense fallback={null}>
    <main className="min-h-[100dvh] flex items-center justify-center px-4" suppressHydrationWarning>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab("login")}
            className={`flex-1 py-2 rounded-xl ${tab === "login" ? "bg-white/15" : "hover:bg-white/10"}`}
          >
            Login
          </button>
          <button
            onClick={() => setTab("register")}
            className={`flex-1 py-2 rounded-xl ${tab === "register" ? "bg-white/15" : "hover:bg-white/10"}`}
          >
            Register
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4" data-lpignore="true" autoComplete="off">
          <div>
            <label htmlFor="bk-username" className="block text-sm mb-1">Username</label>
            <input
              id="bk-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-white/20"
              required
              minLength={3}
              data-lpignore="true"
              autoComplete="off"
            />
          </div>

          {tab === "register" && (
            <div>
              <label htmlFor="bk-email" className="block text-sm mb-1">Email (optional)</label>
              <input
                id="bk-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-white/20"
                data-lpignore="true"
                autoComplete="off"
              />
            </div>
          )}

          <div>
            <label htmlFor="bk-password" className="block text-sm mb-1">Password</label>
            <input
              id="bk-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-white/20"
              required
              minLength={6}
              data-lpignore="true"
              autoComplete="off"
            />
          </div>

          <button
            type="submit"
            disabled={loading || submitting}
            className="w-full py-2 rounded-xl bg-white/90 text-black font-medium hover:bg-white"
          >
            {submitting ? (tab === "login" ? "Signing in..." : "Creating...") : (tab === "login" ? "Sign in" : "Create account")}
          </button>
          {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
        </form>
      </div>
    </main>
    </Suspense>
  );
}


