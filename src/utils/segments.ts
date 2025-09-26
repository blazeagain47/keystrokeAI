export function segmentGraphemes(text: string): string[] {
  const AnyIntl: any = typeof Intl !== "undefined" ? Intl : {};
  if (AnyIntl.Segmenter) {
    const seg = new AnyIntl.Segmenter("en", { granularity: "grapheme" });
    return Array.from(seg.segment(text), (s: any) => s.segment);
  }
  return Array.from(text);
}

export function splitGraphemes(input: string): string[] {
  const AnyIntl: any = typeof Intl !== "undefined" ? Intl : {};
  if (AnyIntl.Segmenter) {
    const seg = new AnyIntl.Segmenter("en", { granularity: "grapheme" });
    return Array.from(seg.segment(input), (s: any) => s.segment);
  }
  return Array.from(input);
}

export function normalizeInputChar(ch: string): string {
  // Map non-breaking space to normal space
  if (ch === "\u00A0") return " ";
  // Normalize to NFKC and unify common variants to mirror compare.ts
  try { ch = ch.normalize("NFKC"); } catch {}
  ch = ch
    // strip zero-width/BOM
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
    // unify quotes
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\u201C\u201D\u2033]/g, '"')
    // unify hyphen/minus
    .replace(/[\u2010-\u2015\u2212]/g, "-");
  return ch;
}

export function displayChar(grapheme: string): string {
  return grapheme === " " ? "\u00A0" : grapheme;
}


