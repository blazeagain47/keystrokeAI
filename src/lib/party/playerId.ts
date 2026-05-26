// Reuse the same anonymous identity blazeKey already mints for guest runs
// (`bk_guest_id` in TypingTest.tsx). Keeping the key identical means a user
// who has already submitted a solo run will use the SAME playerId in a
// party, which is what we want for any future cross-feature analytics.
//
// This module is intentionally tiny and side-effect free until called. Safe
// to import from server components (it no-ops without `window`).

const STORAGE_KEY = "bk_guest_id";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function randomId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {}
  // Fallback for ancient browsers; collision-resistant enough for guest ids.
  return `bk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Returns the stable per-tab playerId, creating one on first call.
 * Returns null on the server (so callers can gate their UI on hydration).
 */
export function getOrCreatePlayerId(): string | null {
  if (!isBrowser()) return null;
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing && typeof existing === "string" && existing.length > 0) {
      return existing;
    }
    const fresh = randomId();
    window.localStorage.setItem(STORAGE_KEY, fresh);
    return fresh;
  } catch {
    // localStorage blocked (e.g. private mode quotas). Return a session-only
    // id so the party still functions; it just won't survive reload.
    return randomId();
  }
}

/**
 * Force a brand-new id. Useful for QA when duplicating a tab so two
 * "players" running in the same browser don't collide. Not exposed in UI.
 */
export function resetPlayerId(): string | null {
  if (!isBrowser()) return null;
  try {
    const fresh = randomId();
    window.localStorage.setItem(STORAGE_KEY, fresh);
    return fresh;
  } catch {
    return randomId();
  }
}
