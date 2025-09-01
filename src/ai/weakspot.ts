"use client";

import { useAICoach } from "@/store/aiCoach";

export const weakspot = {
  resetRun: () => useAICoach.getState().resetRun(),
  commitRun: () => useAICoach.getState().commitRun(),
  noteKeystroke: (k: Parameters<ReturnType<typeof useAICoach>["noteKeystroke"]>[0]) =>
    useAICoach.getState().noteKeystroke(k),
  getTopWeak: useAICoach.getState().getTopWeak,
  buildPracticeWordset: useAICoach.getState().buildPracticeWordset,
  useTopWeak: (nChars=3, nDigraphs=2) => useAICoach(s => s.getTopWeak({ nChars, nDigraphs })),
  useEnabled: () => useAICoach(s => s.enabled),
  setEnabled: (v: boolean) => useAICoach.setState({ enabled: v }),
};


