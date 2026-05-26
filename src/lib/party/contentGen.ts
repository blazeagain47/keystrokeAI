// Generates the shared test text that both players will type. Server-only:
// uses the existing local prompt sampler so the API route doesn't depend on
// the Python /api/generate-proxy backend being reachable in dev.
//
// Phase 1 supports words mode only. Time mode lands later and will produce
// a long buffer instead of a fixed-count prompt.

import { generateLocalPrompt } from "@/lib/localPrompt";

import type { PartyTestConfig } from "./types";

export interface GeneratedContent {
  text: string;
  seed: string;
}

const MIN_WORDS = 10;
const MAX_WORDS = 100;

/**
 * Build the canonical testContent for a party. Pure: same seed + config
 * yields the same string, so QA can reproduce a race deterministically.
 */
export function generatePartyContent(config: PartyTestConfig): GeneratedContent {
  if (config.mode !== "words") {
    throw new Error("party_content_unsupported_mode: words mode only in MVP");
  }
  const wc = clamp(Number(config.wordCount ?? 0), MIN_WORDS, MAX_WORDS);
  if (!Number.isFinite(wc) || wc <= 0) {
    throw new Error("party_content_invalid_word_count");
  }

  const seedNum = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
  const seedHex = seedNum.toString(16).padStart(8, "0");

  const text = generateLocalPrompt({
    wordCount: wc,
    seed: seedNum,
    include_numbers: !!config.flags?.numbers,
    include_punctuation: !!config.flags?.punctuation,
  });

  return { text, seed: seedHex };
}

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, Math.floor(n)));
}
