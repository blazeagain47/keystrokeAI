// Client-safe, browser-safe helpers for party code shape validation.
// NO server-only imports. No node:crypto. Safe to bundle in any component.
//
// Server-side code GENERATION (mintCode, mintUniqueCode) stays in code.ts,
// which is guarded by `import "server-only"` and must never be imported
// from client components.

export const CODE_LENGTH = 6;
const CODE_REGEX = /^\d{6}$/;

/**
 * Returns true iff `code` is exactly 6 ASCII digits.
 * Does NOT check whether the code maps to a live party.
 */
export function isValidCodeShape(code: unknown): code is string {
  return typeof code === "string" && CODE_REGEX.test(code);
}

/**
 * Strip whitespace and non-digits from raw user input, then validate
 * length. Returns the 6-digit string on success or null on failure.
 * Safe to call on every keystroke.
 */
export function normalizeCodeInput(raw: string): string | null {
  if (typeof raw !== "string") return null;
  const digitsOnly = raw.replace(/\D+/g, "");
  if (digitsOnly.length !== CODE_LENGTH) return null;
  return digitsOnly;
}
