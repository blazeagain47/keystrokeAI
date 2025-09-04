// src/lib/typing/state.ts
export type CharState = "untyped" | "correct" | "incorrect" | "extra" | "cursor";

export interface WordEval {
  expected: string;
  input: string;           // user's input for this word (no trailing space)
  states: CharState[];     // length = max(expected.length, input.length)
}

import { sameChar } from "@/lib/typing/compare";

// Evaluate a single word: mark mismatches and extra chars
export function evalWord(expected: string, input: string): WordEval {
  const L = Math.max(expected.length, input.length);
  const states: CharState[] = new Array(L).fill("untyped");
  for (let i = 0; i < expected.length; i++) {
    if (i < input.length) states[i] = sameChar(expected[i], input[i]) ? "correct" : "incorrect";
  }
  for (let i = expected.length; i < input.length; i++) states[i] = "extra";
  return { expected, input, states };
}


