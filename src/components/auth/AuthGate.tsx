'use client';
import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import AuthModal from './AuthModal';
import { useAuth } from '@/hooks/useAuth';

/**
 * Site-wide gate that listens for "ks:auth:request" and opens the login modal.
 * Also opens if ?login=1 or ?modal=login is present.
 */
export default function AuthGate() {
  const params = useSearchParams();
  const { user } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    // Open via query (?login=1 or ?modal=login)
    const wantsLogin = params.get('login') === '1' || params.get('modal') === 'login';
    if (wantsLogin && !user) setOpen(true);
  }, [params, user]);

  React.useEffect(() => {
    const onRequest = (e: Event) => {
      const detail = (e as CustomEvent).detail as { reason?: string } | undefined;
      if (!user) {
        setReason(detail?.reason);
        setOpen(true);
      }
    };
    window.addEventListener('ks:auth:request' as any, onRequest);
    // Expose a convenient global for manual testing
    (window as any).ksOpenAuth = (r?: string) =>
      window.dispatchEvent(new CustomEvent('ks:auth:request', { detail: { reason: r } }));
    return () => window.removeEventListener('ks:auth:request' as any, onRequest);
  }, [user]);

  return <AuthModal open={open} onClose={() => setOpen(false)} reason={reason} />;
}
