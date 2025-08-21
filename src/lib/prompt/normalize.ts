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


