// Normalization + comparison helpers for typing tests
export const stripInvisibles = (s: string) =>
  s
    // nbsp -> space
    .replace(/\u00A0/g, " ")
    // zero-width joiners, word joiner, BOM
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
    // unify curly quotes and prime
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\u201C\u201D\u2033]/g, '"')
    // unify hyphen/minus family
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    // normalize form
    .normalize("NFKC");

export const sameChar = (expected: string, typed: string) => {
  if (expected == null || typed == null) return false;
  const a = stripInvisibles(expected);
  const b = stripInvisibles(typed);
  return a === b;
};


