// Server-side 6-digit numeric party-code GENERATION utilities.
//
// IMPORTANT: this module is intentionally server-only. It imports node:crypto
// and must never be bundled into a client component. The `server-only` guard
// below will throw a build-time error if anything tries to import this file
// from a client bundle.
//
// For shape-validation helpers that ARE safe in the browser, use:
//   @/lib/party/codeShape  (normalizeCodeInput, isValidCodeShape, CODE_LENGTH)

import "server-only";

import { randomInt } from "node:crypto";

// Re-export the pure helpers so existing server-side callers
// (api/party/join, api/party/create) can keep their current import path.
export { CODE_LENGTH, isValidCodeShape, normalizeCodeInput } from "./codeShape";

const MAX_EXCLUSIVE = 1_000_000; // 000000..999999

/**
 * Mint a single zero-padded 6-digit code. Cryptographically random.
 */
export function mintCode(): string {
  const n = randomInt(0, MAX_EXCLUSIVE);
  // CODE_LENGTH imported from codeShape via the re-export above
  return String(n).padStart(6, "0");
}

/**
 * Mint a code that passes the caller's "is this currently in use?" check.
 * The check is async because it hits Firestore. Retries up to `maxAttempts`;
 * throws on exhaustion so the caller can return a 503.
 */
export async function mintUniqueCode(
  isInUse: (code: string) => Promise<boolean>,
  maxAttempts = 5,
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const candidate = mintCode();
    const taken = await isInUse(candidate);
    if (!taken) return candidate;
  }
  throw new Error("party_code_pool_exhausted");
}
