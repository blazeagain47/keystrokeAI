export type SanitizeFlags = {
  allowPunctuation: boolean;
  allowNumbers: boolean;
};

/**
 * Enforces UI invariants on any prompt string.
 * - removes punctuation if not allowed
 * - removes digits if not allowed
 * - collapses whitespace
 */
export function sanitizePrompt(text: string, flags: SanitizeFlags): string {
  let s = String(text ?? "");

  if (!flags.allowPunctuation) {
    s = s.replace(/[^A-Za-z0-9\s]/g, " ");
  }
  if (!flags.allowNumbers) {
    s = s.replace(/[0-9]/g, " ");
  }

  s = s.replace(/\s+/g, " ").trim();
  return s;
}


