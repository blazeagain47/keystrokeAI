// src/lib/text.ts
export function normalizePromptWords(input: string): string {
  return String(input).replace(/\s+/g, " ").trim();
}


