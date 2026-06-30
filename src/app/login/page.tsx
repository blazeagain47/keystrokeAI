"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/auth";
import { useAuthTransitionStore } from "@/store/authTransition";

// Guarantees the full-screen loader is visible long enough to read even
// when the backend responds almost instantly, avoiding a jarring flash.
const AUTH_LOADER_MIN_MS = 600;

type Tab = "login" | "register";

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const { login, register, loading } = useAuthStore();
  const router = useRouter();
  const usernameRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  // Sync tab from URL hash / query param
  useEffect(() => {
    const apply = () => {
      try {
        const hash = (window.location.hash || "").replace(/^#/, "").toLowerCase();
        const q = new URLSearchParams(window.location.search).get("tab")?.toLowerCase() || "";
        const isReg = hash === "register" || hash === "signup" || q === "register" || q === "signup";
        setTab(isReg ? "register" : "login");
      } catch {
        setTab("login");
      }
    };
    apply();
    window.addEventListener("hashchange", apply);
    window.addEventListener("popstate", apply);
    return () => {
      window.removeEventListener("hashchange", apply);
      window.removeEventListener("popstate", apply);
    };
  }, []);

  // Clear error and focus username when switching tabs
  const switchTab = (next: Tab) => {
    setErr(null);
    setTab(next);
    setTimeout(() => usernameRef.current?.focus(), 80);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErr(null);
    setSubmitting(true);
    useAuthTransitionStore.getState().start(tab === "register" ? "register" : "login");
    try {
      const minDelay = new Promise((res) => setTimeout(res, AUTH_LOADER_MIN_MS));
      const authPromise =
        tab === "login" ? login(username, password) : register(username, password, email || undefined);
      await Promise.all([minDelay, authPromise]);
      router.replace("/account");
      // Leave the full-screen loader active — /account clears it once the
      // user's data is hydrated, so the transition reads as one continuous
      // load instead of flashing the page skeleton in between.
    } catch (error: any) {
      useAuthTransitionStore.getState().stop();
      setErr(error?.message || "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) return null;

  const isLogin = tab === "login";
  const busy = loading || submitting;

  return (
    <main className="min-h-[100dvh] flex flex-col items-center justify-center px-4 py-12" suppressHydrationWarning>
      {/* Back to home */}
      <motion.a
        href="/"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8 inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
          <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Back to blazeKey
      </motion.a>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="bk-fire-card relative overflow-hidden">
          {/* Subtle animated sheen */}
          <div className="bk-card-sheen absolute inset-0 rounded-[16px] pointer-events-none" />

          <div className="relative z-10 p-7 sm:p-8">
            {/* Logo + heading */}
            <div className="flex flex-col items-center text-center mb-7">
              <FireLogo />
              <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">
                {isLogin ? "Welcome back" : "Create your account"}
              </h1>
              <p className="mt-1 text-sm text-white/45">
                {isLogin
                  ? "Sign in to sync your progress and stats"
                  : "Join blazeKey and start tracking your speed"}
              </p>
            </div>

            {/* Tab switcher */}
            <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/8 mb-6">
              {(["login", "register"] as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => switchTab(t)}
                  className="relative flex-1 py-2 text-sm font-medium rounded-lg transition-colors duration-150"
                  style={{ color: tab === t ? "white" : "rgba(255,255,255,0.45)" }}
                >
                  {tab === t && (
                    <motion.span
                      layoutId="tab-pill"
                      className="absolute inset-0 rounded-lg"
                      style={{
                        background: "linear-gradient(135deg, rgba(255,61,0,0.28), rgba(255,106,0,0.20))",
                        boxShadow: "inset 0 0 0 1px rgba(255,106,0,0.18)",
                      }}
                      transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    />
                  )}
                  <span className="relative z-10 capitalize">{t === "login" ? "Sign in" : "Create account"}</span>
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={onSubmit} className="space-y-3" data-lpignore="true" autoComplete="off">

              {/* Username */}
              <FormField label="Username">
                <div className="relative">
                  <FieldIcon>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.4"/>
                      <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                  </FieldIcon>
                  <input
                    ref={usernameRef}
                    id="bk-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="yourname"
                    required
                    minLength={3}
                    maxLength={32}
                    data-lpignore="true"
                    autoComplete="off"
                    className="bk-input pl-10"
                  />
                </div>
              </FormField>

              {/* Email — only on register, animated */}
              <AnimatePresence initial={false}>
                {!isLogin && (
                  <motion.div
                    key="email-field"
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                    style={{ overflow: "hidden" }}
                  >
                    <FormField label="Email" hint="optional">
                      <div className="relative">
                        <FieldIcon>
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/>
                            <path d="M1 5.5l7 4.5 7-4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                          </svg>
                        </FieldIcon>
                        <input
                          id="bk-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          data-lpignore="true"
                          autoComplete="off"
                          className="bk-input pl-10"
                        />
                      </div>
                    </FormField>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Password */}
              <FormField label="Password">
                <div className="relative">
                  <FieldIcon>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                      <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                      <circle cx="8" cy="11" r="1" fill="currentColor"/>
                    </svg>
                  </FieldIcon>
                  <input
                    id="bk-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    maxLength={128}
                    data-lpignore="true"
                    autoComplete="off"
                    className="bk-input pl-10 pr-10"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </FormField>

              {/* Error message */}
              <AnimatePresence>
                {err && (
                  <motion.div
                    key="err"
                    initial={{ opacity: 0, y: -4, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -4, height: 0 }}
                    transition={{ duration: 0.18 }}
                    className="bk-error-line flex items-start gap-2"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-[1px]">
                      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4"/>
                      <path d="M8 5v4M8 11v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                    {err}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit button */}
              <motion.button
                type="submit"
                disabled={busy}
                whileTap={busy ? {} : { scale: 0.97 }}
                className="relative w-full py-2 rounded-xl text-sm font-medium text-white mt-1 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
                style={{
                  background: "linear-gradient(135deg, #d9460a 0%, #e8600f 50%, #f07a1a 100%)",
                  boxShadow: "0 0 0 1px rgba(255,106,0,0.18) inset, 0 4px 16px -6px rgba(255,90,0,0.35)",
                }}
              >
                {submitting
                  ? (isLogin ? "Signing in…" : "Creating account…")
                  : (isLogin ? "Sign in" : "Create account")}
              </motion.button>
            </form>

            {/* Footer toggle */}
            <p className="mt-5 text-center text-sm text-white/40">
              {isLogin ? "New to blazeKey?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => switchTab(isLogin ? "register" : "login")}
                className="text-white/70 hover:text-white font-medium transition-colors hover:underline underline-offset-2"
              >
                {isLogin ? "Create an account" : "Sign in"}
              </button>
            </p>
          </div>
        </div>

        {/* Fine print */}
        <p className="mt-4 text-center text-xs text-white/20">
          By continuing you agree to blazeKey&apos;s terms &amp; privacy policy.
        </p>
      </motion.div>
    </main>
  );
}

/* ─── Small helper components ─────────────────────────────── */

function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <label className="text-sm font-medium text-white/70">{label}</label>
        {hint && (
          <span className="text-[11px] text-white/30 font-normal">({hint})</span>
        )}
      </div>
      {children}
    </div>
  );
}

function FieldIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30">
      {children}
    </span>
  );
}

function FireLogo() {
  return (
    <div className="relative bk-logo-orb w-14 h-14 flex items-center justify-center">
      <svg viewBox="0 0 48 48" className="w-9 h-9 bk-logo-glow" aria-hidden>
        <defs>
          <linearGradient id="lg-fire" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FF3D00" />
            <stop offset="55%" stopColor="#FF6A00" />
            <stop offset="100%" stopColor="#FFD36E" />
          </linearGradient>
        </defs>
        <path
          d="M24 4c0 0-2 6-6 10-3 3-5 6-5 10 0 7 5 12 11 13-1-2-2-4-1-7 1-3 3-5 5-7 0 4 2 7 4 9 2-3 3-6 2-10 3 3 4 6 4 9 0 6-4 11-10 12 7 1 14-4 14-13C42 18 34 8 24 4z"
          fill="url(#lg-fire)"
        />
      </svg>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 2l12 12M6.5 6.6A2 2 0 0 0 9.4 9.5M4 4.3C2.4 5.4 1 8 1 8s3 5 7 5a6.5 6.5 0 0 0 3.3-.9M7 3.1A6.5 6.5 0 0 1 8 3c4 0 7 5 7 5a12 12 0 0 1-1.7 2.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}
