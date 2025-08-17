// Normalization + comparison helpers for typing tests
export const stripInvisibles = (s: string) =>
  s
    // nbsp -> space
    .replace(/\u00A0/g, " ")
    // zero-width joiners etc.
    .replace(/[\u200B-\u200D\u2060]/g, "")
    // normalize form
    .normalize("NFKC");

export const sameChar = (expected: string, typed: string) => {
  if (!expected || !typed) return false;
  const a = stripInvisibles(expected);
  const b = stripInvisibles(typed);
  return a === b;
};


