import { EN_CORE_5K } from "@/lib/wordbanks/en_core_5k";

export const WORDS = EN_CORE_5K;

export type LocalPromptOpts = {
  wordCount?: number; // for words mode
  seed?: number;
  include_numbers?: boolean;
  include_punctuation?: boolean;
  minLen?: number;
  recentBanList?: string[];
};

import { makeRng, hashStr, sampleK } from "@/lib/rand";
import { toLowerLettersOnly } from "@/lib/prompt/normalize";
import { normalizePromptWords } from "@/lib/text";
import { sanitizePrompt } from "@/lib/prompt/sanitize";

export function generateLocalPrompt(opts: LocalPromptOpts = {}) {
  const wc = Math.max(1, opts.wordCount ?? 50);
  const baseSeed = (opts.seed ?? (Date.now() ^ hashStr(String(wc)))) >>> 0;
  const rng = makeRng(baseSeed);

  const allowNums = !!opts.include_numbers;
  const allowPunct = !!opts.include_punctuation;
  const minLen = Math.max(1, opts.minLen ?? 2);

  const filtered = WORDS.filter(w => {
    const s = String(w).trim();
    if (!s) return false;
    if (!allowNums && /[0-9]/.test(s)) return false;
    if (!allowPunct && /[^a-zA-Z0-9]/.test(s)) return false;
    if (s.length < minLen) return false;
    // NEW: cap long tokens for fallback path (letters-only length)
    if (s.replace(/[^a-z]/gi, '').length > 8) return false;
    return true;
  });

  const ban = new Set((opts.recentBanList ?? []).map(x => x.toLowerCase()));
  const avail = filtered.filter(w => !ban.has(String(w).toLowerCase()));
  const pool = avail.length >= wc ? avail : filtered;

  const picks = sampleK(pool, wc, rng);
  let text = picks.join(" ");
  text = toLowerLettersOnly(text, "en-US");
  text = normalizePromptWords(text);
  text = sanitizePrompt(text, { allowPunctuation: allowPunct, allowNumbers: allowNums });
  return text;
}


