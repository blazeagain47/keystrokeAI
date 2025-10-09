export type CoderLanguage = "javascript" | "python" | "html" | "css" | "java";

import { JAVASCRIPT_SNIPPETS } from "./javascript";
import { PYTHON_SNIPPETS } from "./python";
import { HTML_SNIPPETS } from "./html";
import { CSS_SNIPPETS } from "./css";
import { JAVA_SNIPPETS } from "./java";

const POOLS: Record<CoderLanguage, string[]> = {
  javascript: JAVASCRIPT_SNIPPETS,
  python: PYTHON_SNIPPETS,
  html: HTML_SNIPPETS,
  css: CSS_SNIPPETS,
  java: JAVA_SNIPPETS,
};

/** Build a punctuation-preserving, space-tokenized prompt with exactly `target` tokens. */
export function buildCoderPrompt(lang: CoderLanguage, target = 25): string {
  const pool = POOLS[lang] ?? POOLS.javascript;
  const seen = new Set<number>();
  let tokens: string[] = [];

  while (tokens.length < target && seen.size < pool.length) {
    const idx = Math.floor(Math.random() * pool.length);
    if (seen.has(idx)) continue;
    seen.add(idx);
    const normalized = String(pool[idx]).replace(/\s+/g, " ").trim();
    if (!normalized) continue;
    tokens = tokens.concat(normalized.split(" ").filter(Boolean));
  }

  if (tokens.length === 0) return `console.log("blazeKey coder mode");`;
  if (tokens.length > target) tokens = tokens.slice(0, target);
  return tokens.join(" ");
}


