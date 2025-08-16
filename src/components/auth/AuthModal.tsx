'use client';
import * as React from 'react';
import { useAuth } from '@/hooks/useAuth';
import Modal from '@/components/ui/Modal';
import { motion } from 'framer-motion';

type Mode = 'login' | 'register';

export default function AuthModal({
  open,
  onClose,
  defaultMode = 'login',
  reason,
}: {
  open: boolean;
  onClose: () => void;
  defaultMode?: Mode;
  reason?: string;
}) {
  const { signIn, signUp, signInWithGoogle, loading, user } = useAuth();
  const [mode, setMode] = React.useState<Mode>(defaultMode);
  const [username, setUsername] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setError(null);
      setSubmitting(false);
    }
  }, [open, mode]);

  React.useEffect(() => {
    if (user && open) onClose();
  }, [user, open, onClose]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await signIn(username, password);
      } else {
        await signUp(username, password, email || undefined);
      }
    } catch (err: any) {
      setError(err?.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  const disabled = submitting || loading;

  return (
    <Modal open={open} onClose={onClose} ariaLabel="Sign in dialog" maxWidth="max-w-lg">
      <div className="p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <KeystrokeMark className="h-10 w-10" />
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-white">
              {mode === 'login' ? 'Sign in' : 'Create your account'}
            </h2>
            <p className="text-sm text-zinc-400">
              {reason ? `Required to ${reason.replaceAll('_', ' ')}` : 'Save your progress & sync across devices'}
            </p>
          </div>
        </div>

        {/* Providers */}
        <div className="mt-6 grid grid-cols-1 gap-3">
          <button
            onClick={async () => {
              try {
                await signInWithGoogle();
              } catch {
                // Placeholder
              }
            }}
            disabled
            title="Google sign-in coming soon"
            className="inline-flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-zinc-800/70 px-4 py-3 text-zinc-200 ring-0 transition hover:bg-zinc-800/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <GoogleIcon className="h-5 w-5" />
            Continue with Google
          </button>
          <button
            disabled
            title="Apple sign-in coming soon"
            className="inline-flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-zinc-800/70 px-4 py-3 text-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <AppleIcon className="h-5 w-5" />
            Continue with Apple
          </button>
        </div>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-zinc-500">or</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-1 gap-3">
            <label className="text-sm text-zinc-300">
              Username
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-white outline-none ring-0 placeholder:text-zinc-500"
                placeholder="yourname"
              />
            </label>
            {mode === 'register' && (
              <label className="text-sm text-zinc-300">
                Email (optional)
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-white outline-none ring-0 placeholder:text-zinc-500"
                  placeholder="you@example.com"
                />
              </label>
            )}
            <label className="text-sm text-zinc-300">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-white outline-none ring-0 placeholder:text-zinc-500"
                placeholder="••••••••"
              />
            </label>
          </div>
          {error ? (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          ) : null}
          <motion.button
            whileTap={{ scale: 0.98 }}
            disabled={disabled}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white/90 px-4 py-2 font-medium text-zinc-900 transition hover:bg-white disabled:opacity-60"
          >
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </motion.button>
        </form>

        {/* Footer */}
        <div className="mt-4 text-center text-sm text-zinc-400">
          {mode === 'login' ? (
            <>
              New here?{' '}
              <button className="text-white hover:underline" onClick={() => setMode('register')}>
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button className="text-white hover:underline" onClick={() => setMode('login')}>
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

function KeystrokeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className}>
      <defs>
        <linearGradient id="ksg" x1="0" x2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect rx="10" ry="10" x="1" y="1" width="46" height="46" fill="url(#ksg)" opacity="0.2" />
      <path
        d="M14 30l8-12 6 8 6-10"
        stroke="url(#ksg)"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.2-1.6 3.5-5.4 3.5-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.8 0 3.1.8 3.8 1.5l2.6-2.5C16.9 3 14.7 2 12 2 6.9 2 2.7 6.2 2.7 11.3S6.9 20.6 12 20.6c6.6 0 9.1-4.6 9.1-7 0-.5-.1-.8-.1-1.1H12z" />
    </svg>
  );
}
function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.5 13.6c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.6-1.6-3.1-1.7-1.3-.1-2.6.8-3.3.8-.7 0-1.8-.8-3- .8-1.5 0-2.8.9-3.6 2.2-1.6 2.7-.4 6.6 1.1 8.8.7 1 1.5 2.1 2.6 2.1 1-.1 1.4-.7 2.6-.7 1.2 0 1.6.7 2.7.7s1.8-1 2.5-2c.8-1.2 1.1-2.3 1.1-2.4-.1 0-2.1-.8-2.1-3.6zM14.6 5.3c.6-.7 1-1.6 1-2.5-1 .1-2 .6-2.7 1.3-.6.7-1 1.6-1 2.5 1-.1 2-.6 2.7-1.3z"
      />
    </svg>
  );
}
