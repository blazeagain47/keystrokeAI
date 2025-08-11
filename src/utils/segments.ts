export function segmentGraphemes(text: string): string[] {
  if (typeof Intl !== "undefined" && (Intl as any).Segmenter) {
    // @ts-ignore
    const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(seg.segment(text), (s: any) => s.segment);
  }
  return Array.from(text);
}

export function normalizeInputChar(ch: string): string {
  if (ch === "\u00A0") return " ";
  return (ch as any).normalize ? (ch as any).normalize("NFC") : ch;
}

export function displayChar(grapheme: string): string {
  return grapheme === " " ? "\u00A0" : grapheme;
}


