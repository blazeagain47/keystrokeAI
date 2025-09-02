/** Lowercase letters only, keep numbers/punctuation intact. Locale-aware if provided. */
export function toLowerLettersOnly(s: string, locale?: string) {
  const loc = locale || "en-US";
  return s
    .normalize("NFKC")
    .split("")
    .map(ch => {
      const isLetter = /\p{L}/u.test(ch);
      return isLetter ? ch.toLocaleLowerCase(loc) : ch;
    })
    .join("");
}

/** Ensure exactly N tokens (by whitespace). Trims, squashes spaces, slices/pads from source. */
export function ensureExactWordCount(source: string, n: number) {
  const tokens = source.trim().split(/\s+/).filter(Boolean);
  if (n <= 0) return "";
  if (tokens.length === n) return tokens.join(" ");
  if (tokens.length > n) return tokens.slice(0, n).join(" ");
  const out: string[] = [];
  const base = Math.max(1, tokens.length);
  for (let i = 0; i < n; i++) out.push(tokens[i % base]);
  return out.join(" ");
}

// Convenience wrapper to cap repeats after padding/truncation.
// Note: kept here to avoid circular imports at call sites.
import { enforceNoRepeat } from "@/lib/prompt/noRepeatLimiter";
import { useSettingsStore } from "@/store/settings";

export function ensureExactNoRepeat(source: string, n: number) {
  const s = ensureExactWordCount(source, n);
  const arr = s.split(/\s+/).filter(Boolean);
  try {
    const settings = (useSettingsStore as any)?.getState?.();
    const max = Number(settings?.test?.maxRepeatPerWord ?? 2);
    const allowPunctuation = settings?.test?.include_punctuation === true;
    const allowNumbers = settings?.test?.include_numbers === true;
    const limited = enforceNoRepeat(arr, {
      max,
      hardCap: 3,
      wordsetKey: settings?.test?.wordSet ?? "core5000",
      allowPunctuation,
      allowNumbers,
    });
    return limited.join(" ");
  } catch {
    return s;
  }
}


