"use client";

import { useAICoach } from "@/store/aiCoach";

// Avoid Zustand hook overloads by deriving the state type from getState()
type AICoachState = ReturnType<typeof useAICoach.getState>;
type NoteKeystrokeArg = Parameters<AICoachState["noteKeystroke"]>[0];

export const weakspot = {
  resetRun: () => useAICoach.getState().resetRun(),
  commitRun: () => useAICoach.getState().commitRun(),
  noteKeystroke: (k: NoteKeystrokeArg) => useAICoach.getState().noteKeystroke(k),
  getTopWeak: useAICoach.getState().getTopWeak,
  buildPracticeWordset: useAICoach.getState().buildPracticeWordset,
  useTopWeak: (nChars=3, nDigraphs=2) => useAICoach(s => s.getTopWeak({ nChars, nDigraphs })),
  useEnabled: () => useAICoach(s => s.enabled),
  setEnabled: (v: boolean) => useAICoach.setState({ enabled: v }),
};


