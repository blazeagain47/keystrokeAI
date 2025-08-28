// src/lib/typing/metrics.ts
import type { WordEval, CharState } from "./state";

export interface RunTally { correct: number; incorrect: number; extra: number; }
export const tallyStates = (states: CharState[]): RunTally =>
  states.reduce((t, s) => {
    if (s === "correct") t.correct++;
    else if (s === "incorrect") t.incorrect++;
    else if (s === "extra") t.extra++;
    return t;
  }, { correct: 0, incorrect: 0, extra: 0 } as RunTally);

export function tallyWords(words: WordEval[]): RunTally {
  return words.reduce((acc, w) => {
    const t = tallyStates(w.states);
    return { correct: acc.correct + t.correct, incorrect: acc.incorrect + t.incorrect, extra: acc.extra + t.extra };
  }, { correct: 0, incorrect: 0, extra: 0 });
}

export function wpmFromTally(t: RunTally, elapsedSec: number) {
  const minutes = Math.max(0.1, elapsedSec / 60);
  return (t.correct / 5) / minutes;
}
export function accuracyFromTally(t: RunTally) {
  const denom = t.correct + t.incorrect + t.extra;
  return denom ? t.correct / denom : 1;
}


