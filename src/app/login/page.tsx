"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";

export default function LoginPage() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const { login, register, loading } = useAuthStore();
  const router = useRouter();

  const [err, setErr] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      if (tab === "login") {
        await login(username, password);
      } else {
        await register(username, password, email || undefined);
      }
      router.replace("/account");
    } catch (error: any) {
      setErr(error?.message || "Authentication failed");
    }
  };

  if (!mounted) return null;

  return (
    <div className="max-w-md mx-auto" suppressHydrationWarning>
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6" suppressHydrationWarning>
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
            <label className="block text-sm mb-1">Username</label>
            <input
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
              <label className="block text-sm mb-1">Email (optional)</label>
              <input
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
            <label className="block text-sm mb-1">Password</label>
            <input
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
            disabled={loading}
            className="w-full py-2 rounded-xl bg-white/90 text-black font-medium hover:bg-white"
          >
            {tab === "login" ? "Sign in" : "Create account"}
          </button>
          {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
        </form>
      </div>
    </div>
  );
}


