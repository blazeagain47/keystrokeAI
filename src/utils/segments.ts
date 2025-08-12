export function segmentGraphemes(text: string): string[] {
  if (typeof Intl !== "undefined" && (Intl as any).Segmenter) {
    // @ts-ignore
    const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(seg.segment(text), (s: any) => s.segment);
  }
  return Array.from(text);
}

export function normalizeInputChar(ch: string): string {
  // Map non-breaking space to normal space
  if (ch === "\u00A0") return " ";
  // Normalize to NFC and lowercase to avoid case/diacritic mismatches with displayed target
  try {
    return ch.normalize("NFC");
  } catch {
    return ch;
  }
}

export function displayChar(grapheme: string): string {
  return grapheme === " " ? "\u00A0" : grapheme;
}


