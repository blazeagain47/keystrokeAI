/**
 * Programmatic, framework-agnostic helper to request authentication.
 * Usage: import { requestAuth } from '@/lib/auth-prompt'; requestAuth('practice_complete');
 */
export function requestAuth(reason?: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('ks:auth:request', { detail: { reason } }));
}
