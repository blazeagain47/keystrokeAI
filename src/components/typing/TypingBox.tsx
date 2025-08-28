"use client"

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { saveTypingResult } from '@/lib/firebase/scores';
import { computeXpAward } from '@/lib/xp';
import { useStatsStore } from '@/stores/useStatsStore';
import { addLocalRun, BlazeRun } from "@/lib/historyLocal";
import { RotateCcw } from 'lucide-react';
import clsx from 'clsx';
import { segmentGraphemes, normalizeInputChar } from "@/utils/segments";
import { evalWord, type WordEval } from "@/lib/typing/state";
import { tallyWords, wpmFromTally, accuracyFromTally } from "@/lib/typing/metrics";
import { createRafQueue } from "@/lib/rafQueue";
import { useStopOnError, useStrictSpace } from "@/store/settings";
import EmbersLayer, { EmbersHandle } from "@/components/fx/EmbersLayer";
import { useSearchParams } from "next/navigation";
import { tl } from "@/lib/timeline";
import { devLog } from "@/lib/devLog";
import useLockScroll from "@/hooks/useLockScroll";

/* NEW – bring in the modernised Shadcn results panel */
// Legacy StatsPanel removed in favor of modern ResultsPanel

/* ─────────────────────────────────────────────────────────── */

export interface TypingBoxProps {
  mode: 'time' | 'words';
  durationSec?: number;
  onStatsUpdate: (wpm: number, accuracy: number, time: number) => void;
  onTestComplete: (wpm: number, accuracy: number, time: number, typedInput: string) => void;
  prompt: string;
  onRequestNewPrompt?: () => void;
  onRequestAppendPrompt?: () => void;
  isLoading?: boolean;
}

const TypingBox: React.FC<TypingBoxProps> = ({ mode, durationSec = 15, onStatsUpdate, onTestComplete, prompt, onRequestNewPrompt, onRequestAppendPrompt, isLoading: externalLoading = false }) => {
  // Fallback; will be replaced by measured DOM line-height
  const LINE_H = 38;

  const searchParams = useSearchParams();
  const debug = searchParams.get('debug') === '1';
  const debugType = searchParams.get('debugType') === '1';
  const debugPaused = searchParams.get('debugPaused') === '1';

  const { user } = useAuth();

  const [words, setWords] = useState<string[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [inputWords, setInputWords] = useState<string[]>([]); // per-word inputs
  const [cursorCol, setCursorCol] = useState(0);              // column within current word
  const [hasStarted, setHasStarted] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [correctChars, setCorrectChars] = useState(0);
  const [totalChars, setTotalChars] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [debugLog, setDebugLog] = useState<any[]>([]);
  const [awardedThisRun, setAwardedThisRun] = useState(false);
  const [time, setTime] = useState(0);

  // Viewport state
  const [visibleStartLine, setVisibleStartLine] = useState(0);

  // Refs for DOM measurement and viewport calculations
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const baseTopRef = useRef(0);
  const lineHeightRef = useRef(LINE_H);
  const wordLineRef = useRef<number[]>([]);
  const lineEndsRef = useRef<number[]>([]);
  const lastLineRef = useRef(0);
  // Dev-only: track last per-char status to log flips from incorrect -> other
  const lastStatusRef = useRef<Record<string, 'correct' | 'incorrect' | 'cursor' | 'untyped'>>({});
  const isCompletedRef = useRef(false);

  // Tab/restart handling
  const isTabHeldRef = useRef(false);
  const lastTabDownAtRef = useRef(0);
  const endAtRef = useRef<number>(0);

  const CENTER_OFFSET = 1; // Show 1 line above and 1 below the active line
  const TOTAL_LINES = 3;   // 3-line viewport

  // Safe spacing so filters/header never overlap the typing viewport
  const SAFE_TOP_PX = 140;   // top spacer (tune if your header/filters grow)
  const SAFE_BOTTOM_PX = 48; // bottom breathing room to avoid clipping

  // Gates centering/transform until after we have real measurements
  const [measured, setMeasured] = React.useState(false);

  // lock page scroll while TypingBox is shown
  useLockScroll(true);

  // --- Re-run stabilizer state ---
  const [runSeq, setRunSeq] = React.useState(0);

  // --- Hard reset of viewport/metrics before a new test is applied ---
  const resetViewport = React.useCallback(() => {
    // stop using previous measurements
    setMeasured(false);
    setVisibleStartLine(0);

    // clear measurement bookkeeping
    lastLineRef.current = 0;
    wordLineRef.current = [];
    if (contentRef.current) contentRef.current.style.transform = "translateY(0px)";
  }, []);

  // Settings flags
  const stopOnError = useStopOnError();
  const strictSpace = useStrictSpace();

  // FX layer
  const emberRef = React.useRef<EmbersHandle>(null);

  function calculateWPM(correct: number, timeInSeconds: number): number {
    if (timeInSeconds <= 0) return 0;
    return Math.round((correct / 5) / (timeInSeconds / 60));
  }

  function calculateAccuracy(correct: number, total: number): number {
    if (total === 0) return 100;
    return Math.round((correct / total) * 100);
  }

  const clampTop = useCallback((top: number) => {
    const maxLines = Math.max(1, wordLineRef.current.length > 0 ? Math.max(...wordLineRef.current) + 1 : 1);
    const maxStart = Math.max(0, maxLines - TOTAL_LINES);
    return Math.max(0, Math.min(maxStart, top));
  }, []);

  const targetStream = useMemo(() => words.join(' '), [words]);

  // Computed word evaluations (persistent per-char states)
  const evals = useMemo<WordEval[]>(() => {
    return words.map((w, i) => evalWord(w, inputWords[i] ?? ""));
  }, [words, inputWords]);

  /* ───────── Load prompt from prop ───────── */
  const resetFromPrompt = useCallback((text: string) => {
    resetViewport();
    setRunSeq((x) => x + 1);
    setIsLoading(true);
    const nextWords = text.split(" ").filter(Boolean);
    setWords(nextWords);
    setInputWords(Array(nextWords.length).fill(""));
    setCurrentWordIndex(0);
    setCursorCol(0);
    setHasStarted(false);
    setStartTime(null);
    setIsComplete(false);
    isCompletedRef.current = false;
    setCorrectChars(0);
    setTotalChars(0);
    setIsLoading(false);
    setVisibleStartLine(0);
    if (contentRef.current) contentRef.current.style.transform = `translateY(0px)`;
    lastLineRef.current = 0;
    wordLineRef.current = [];
  }, []);

  /* init & prop change */
  useEffect(() => {
    if (prompt && prompt.length > 0) {
      resetFromPrompt(prompt);
    }
  }, [prompt, resetFromPrompt]);

  /* util to compute per-word line mapping */
  const computeWordLines = useCallback(() => {
    const baseTop = wordRefs.current.find(Boolean)?.offsetTop ?? 0;
    baseTopRef.current = baseTop;
    const lh = lineHeightRef.current || LINE_H;
    const lines: number[] = [];
    wordRefs.current.forEach((el, idx) => {
      if (!el) { lines[idx] = 0; return; }
      lines[idx] = Math.max(0, Math.round((el.offsetTop - baseTop) / lh));
    });
    wordLineRef.current = lines;
    const ends: number[] = [];
    lines.forEach((ln, idx) => { ends[ln] = idx; });
    lineEndsRef.current = ends;
  }, [LINE_H]);

  // Measure real line-height & word lines AFTER fonts load, then lock it.
  // This prevents the "jump" when typing starts.
  useEffect(() => {
    if (!words.length) return;
    let cancelled = false;

    const ready = (document as any).fonts?.ready ?? Promise.resolve();
    ready.then(() => {
      if (cancelled) return;

      // Try to read computed line-height from the first rendered word
      const firstEl = wordRefs.current.find(Boolean);
      if (firstEl) {
        const cs = getComputedStyle(firstEl);
        const lh = parseFloat(cs.lineHeight);
        if (!Number.isNaN(lh) && lh > 0) {
          lineHeightRef.current = Math.max(24, Math.round(lh));
        }
      }

      computeWordLines();
      setMeasured(true);
    });

    return () => { cancelled = true; };
  }, [words, runSeq, computeWordLines]);

  // when the words array (or a run token if you have one) changes,
  // clear the 'measured' gate so we re-measure and re-center correctly.
  useEffect(() => {
    setMeasured(false);
  }, [words]);

  // getCharacterStatus removed; rendering uses `evals` with persistent states

  /* Stats computations + live updates */
  const wpmSeries = useRef<{ time: number; wpm: number }[]>([]);

  const pushStats = useCallback(() => {
    if (!hasStarted || !startTime || isComplete) return;
    const now = Date.now();
    const elapsed = (now - startTime) / 1000;
    const tally = tallyWords(evals);
    const wpm = Math.round(wpmFromTally(tally, elapsed));
    const acc = Math.round(accuracyFromTally(tally) * 100);
    setCorrectChars(tally.correct);
    setTotalChars(tally.correct + tally.incorrect + tally.extra);
    wpmSeries.current.push({ time: elapsed, wpm });
    onStatsUpdate(wpm, acc, elapsed);
  }, [hasStarted, startTime, isComplete, evals, onStatsUpdate]);

  /* Timer effect for time mode */
  useEffect(() => {
    if (mode === 'time' && hasStarted && startTime && !isComplete) {
      const interval = setInterval(() => {
        const now = Date.now();
        const elapsed = (now - startTime) / 1000;
        setTime(elapsed);
        pushStats();
        if (elapsed >= durationSec) {
          const tally = tallyWords(evals);
          const finalWpm = Math.round(wpmFromTally(tally, elapsed));
          const finalAcc = Math.round(accuracyFromTally(tally) * 100);
          setIsComplete(true);
          onTestComplete(finalWpm, finalAcc, elapsed, (inputWords || []).join(' '));
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [hasStarted, startTime, isComplete, evals, mode, onTestComplete, inputWords, durationSec, pushStats]);

  /* auto-advance viewport so current line is centered within the viewport */
  useEffect(() => {
    if (!measured) return; // wait until we’ve measured/laid out once

    const line = wordLineRef.current[currentWordIndex] ?? 0;
    const desiredTop = clampTop(line - CENTER_OFFSET);
    if (desiredTop !== visibleStartLine) {
      setVisibleStartLine(desiredTop);
      if (contentRef.current) {
        const lh = lineHeightRef.current || LINE_H;
        const px = Math.round(desiredTop * lh);
        contentRef.current.style.transform = `translateY(-${px}px)`;
      }
    }
    lastLineRef.current = line;
  }, [measured, currentWordIndex, visibleStartLine, clampTop, runSeq]);

  // Util to spawn embers at caret position
  function spawnAtCaret(n = 2) {
    const el = document.querySelector('[data-caret="on"]') as HTMLElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = rect.left + rect.width * 0.6 + window.scrollX;
    const py = rect.top + rect.height * 0.2 + window.scrollY;
    emberRef.current?.spawn(px, py, n);
  }

  const finalizeWordsRun = useCallback(() => {
    if (isCompletedRef.current) return;
    isCompletedRef.current = true;
    const wevals: WordEval[] = words.map((w, i) => evalWord(w, inputWords[i] ?? ""));
    const tally = tallyWords(wevals);
    const elapsedSec = startTime ? (Date.now() - startTime) / 1000 : 0;
    const finalWpm = Math.round(wpmFromTally(tally, elapsedSec));
    const finalAcc = Math.round(accuracyFromTally(tally) * 100);
    setIsComplete(true);
    onTestComplete(finalWpm, finalAcc, elapsedSec, (inputWords || []).join(' '));
  }, [words, inputWords, startTime, onTestComplete]);

  /* rAF-batched input handling */
  const applyBatch = useCallback((keys: string[]) => {
    if (!keys.length) return;
    if (isCompletedRef.current) return;
    // local copies for single-commit
    let nextWords = inputWords.slice();
    let wi = currentWordIndex;
    let col = cursorCol;
    let finishedByTyping = false;
    let finishedBySpace = false;

    const commitInput = (idx: number, next: string) => { nextWords[idx] = next; };

    for (const k of keys) {
      if (k === 'Backspace') {
        const curr = nextWords[wi] ?? "";
        if (col > 0 && curr.length > 0) {
          commitInput(wi, curr.slice(0, -1));
          col = Math.max(0, col - 1);
        } else if (wi > 0) {
          wi = wi - 1;
          const prevIn = nextWords[wi] ?? "";
          col = prevIn.length;
        }
        continue;
      }

      // ── Space key: Monkeytype semantics ──────────────────────────────
      if (k === ' ') {
        // current word input and expected target
        const expected = words[wi] ?? "";
        const curr = nextWords[wi] ?? "";

        // 1) If pressed at the very start (no first letter yet) → DO NOTHING
        //    (Don't advance, don't mark anything.)
        if (curr.length === 0) {
          continue; // ignore this space completely
        }

        // 2) If we typed ≥1 char but didn't finish the word → mark remainder incorrect
        //    We do this by padding the input up to expected.length with a sentinel
        //    char that never equals the expected, so evalWord marks them "incorrect".
        if (curr.length < expected.length) {
          const PAD = "\u0001"; // any char that won't match expected letters
          const padded = curr.padEnd(expected.length, PAD);
          commitInput(wi, padded);
        }

        // 3) Honor stopOnError: if enabled and this word contains mistakes or extras,
        //    block advancing. (Monkeytype's stop-on-error behavior.)
        const we = evalWord(expected, nextWords[wi] ?? "");
        const hasBlocking =
          stopOnError && (we.states.includes("incorrect") || we.states.includes("extra"));
        if (hasBlocking) {
          // do not advance; user must fix the word first
          continue;
        }

        // 4) Advance to next word (or finish if last)
        // Before advancing wi past last index, set finishedBySpace if we’re at last word
        if (wi >= words.length - 1) {
          finishedBySpace = true;
          wi = words.length;
          continue;
        }
        wi = wi + 1;
        col = (nextWords[wi] ?? "").length; // place caret at start-of-next (or after any existing input)
        spawnAtCaret(3);
        continue;
      }

      if (k.length === 1) {
        const ch = normalizeInputChar(k);
        const curr = nextWords[wi] ?? "";
        const colBefore = col;
        commitInput(wi, curr + ch);
        col = col + 1;
        // If we’re on the last word and we've now typed at least expected length → finish
        const isLastWord = wi >= words.length - 1;
        if (isLastWord) {
          const expectedLast = words[words.length - 1] ?? "";
          const inputLast = nextWords[words.length - 1] ?? "";
          if (inputLast.length >= expectedLast.length) {
            finishedByTyping = true;
          }
        }
        // check if this char is correct and spawn embers
        const we = evalWord(words[wi] ?? "", curr + ch);
        const st = we.states[colBefore];
        if (st === "correct") {
          spawnAtCaret(2);
        }
        continue;
      }
    }

    // Single commit of state
    setInputWords(nextWords);
    setCurrentWordIndex(wi);
    setCursorCol(col);

    // Words-mode: finalize immediately if we just finished by typing or space on last word
    if (mode === 'words' && (finishedByTyping || finishedBySpace)) {
      finalizeWordsRun();
      return; // ensure we don't push further state this frame
    }

    // compute metrics once per frame
    if (hasStarted && startTime && !isComplete) {
      const now = Date.now();
      const elapsed = (now - startTime) / 1000;
      const wevals: WordEval[] = words.map((w, i) => evalWord(w, nextWords[i] ?? ""));
      const tally = tallyWords(wevals);
      const wpm = Math.round(wpmFromTally(tally, elapsed));
      const acc = Math.round(accuracyFromTally(tally) * 100);
      setCorrectChars(tally.correct);
      setTotalChars(tally.correct + tally.incorrect + tally.extra);
      wpmSeries.current.push({ time: elapsed, wpm });
      onStatsUpdate(wpm, acc, elapsed);
    }

    // words-mode completion when advancing from last word
    if (mode === 'words' && !isComplete) {
      if (wi >= words.length) {
        const end = Date.now();
        const elapsed = startTime ? (end - startTime) / 1000 : 0;
        const wevals: WordEval[] = words.map((w, i) => evalWord(w, nextWords[i] ?? ""));
        const tally = tallyWords(wevals);
        const finalWpm = Math.round(wpmFromTally(tally, elapsed));
        const finalAcc = Math.round(accuracyFromTally(tally) * 100);
        setIsComplete(true);
        onTestComplete(finalWpm, finalAcc, elapsed, nextWords.join(' '));
      }
    }
  }, [inputWords, currentWordIndex, cursorCol, hasStarted, startTime, isComplete, words, mode, onStatsUpdate, onTestComplete, stopOnError, finalizeWordsRun]);

  const enqueueKey = useMemo(() => createRafQueue<string>(applyBatch), [applyBatch]);

  /* ───────── Keyboard handler ───────── */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.("[data-click-only]")) {
        return;
      }

      if (externalLoading || isLoading || isComplete) return;

      /* start timer */
      if (!hasStarted && e.key.length === 1) {
        try { tl('first key', { key: e.key, runId: 'n/a' }); } catch {}
        try { devLog('first keydown', e.key); } catch {}
        setHasStarted(true);
        setStartTime(Date.now());
        if (mode === 'time') {
          endAtRef.current = Date.now() + durationSec * 1000;
        }
      }

      /* restart combo handling */
      if (e.key === 'Tab') {
        e.preventDefault();
        isTabHeldRef.current = true;
        lastTabDownAtRef.current = Date.now();
        return;
      }
      if (e.key === 'Enter') {
        const recentTab = lastTabDownAtRef.current && (Date.now() - lastTabDownAtRef.current <= 500);
        if (isTabHeldRef.current || recentTab) {
          e.preventDefault();
          try { tl('TypingBox TabEnter restart'); } catch {}
          if (onRequestNewPrompt) {
            void onRequestNewPrompt();
          } else if (prompt) {
            resetFromPrompt(prompt);
          }
          return;
        }
      }

      /* backspace */
      if (e.key === 'Backspace') {
        e.preventDefault();
        enqueueKey('Backspace');
        return;
      }

      /* space */
      if (e.key === ' ') {
        e.preventDefault();
        enqueueKey(' ');
        return;
      }

      /* regular char */
      if (e.key.length === 1) {
        e.preventDefault();
        enqueueKey(e.key);
        return;
      }
    },
    [
      externalLoading,
      isLoading,
      isComplete,
      hasStarted,
      startTime,
      mode,
      durationSec,
      words,
      currentWordIndex,
      onStatsUpdate,
      onTestComplete,
      debug,
      debugPaused,
      visibleStartLine,
      clampTop,
      targetStream,
      pushStats,
      resetFromPrompt,
      onRequestNewPrompt,
      prompt,
      enqueueKey
    ]
  );

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      isTabHeldRef.current = false;
    }
  }, []);

  /* attach listener */
  useEffect(() => {
    try { document.body.classList.add("bk-typing-active"); } catch {}
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      try { document.body.classList.remove("bk-typing-active"); } catch {}
    };
  }, [handleKeyDown, handleKeyUp]);

  /* cursor blink */
  useEffect(() => {
    const interval = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  if (externalLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-300"></div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="mx-auto max-w-5xl px-4 sm:px-6"
      style={{
        minHeight: "100svh",
        contain: "layout style paint",
      }}
    >
      {/* Top spacer so filters/header never overlap the typing viewport */}
      <div aria-hidden className="pointer-events-none" style={{ height: SAFE_TOP_PX }} />

      {/* Fixed 3-line window; +2px buffer avoids bottom clipping on fractional line-heights */}
      <div
        className="overflow-hidden rounded-xl select-none"
        style={{
          height: `${TOTAL_LINES * (lineHeightRef.current || LINE_H) + 2}px`,
          overscrollBehavior: "none",
          touchAction: "none",
        }}
        onWheelCapture={(e) => e.preventDefault()}
        onTouchMoveCapture={(e) => e.preventDefault()}
      >
        <div
          ref={contentRef}
          className="relative transition-transform duration-200 ease-out"
          style={{
            lineHeight: `${lineHeightRef.current || LINE_H}px`,
            fontSize: "1.1rem",
            fontFamily:
              'JetBrains Mono, Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
            paddingBottom: SAFE_BOTTOM_PX,
            willChange: "transform",
            overscrollBehaviorY: "contain",
          }}
        >
          <div className="px-4 leading-relaxed text-lg">
            {evals.map((we, wi) => {
              const active = wi === currentWordIndex;
              const expected = we.expected;
              const input = inputWords[wi] ?? "";
              const L = Math.max(expected.length, input.length);

              return (
                <React.Fragment key={wi}>
                  <span
                    ref={(el) => { wordRefs.current[wi] = el; }}
                    className="inline-block bk-word"
                    data-active={active ? "1" : undefined}
                  >
                    {Array.from({ length: L }).map((_, ci) => {
                      // Decide what to render and what state to paint
                      let showChar: string;
                      let st: "untyped" | "correct" | "incorrect" | "extra" | "cursor";

                      if (ci < expected.length) {
                        // Always render the EXPECTED character for the main word body
                        showChar = expected[ci] ?? "";
                        if (ci < input.length) {
                          st = input[ci] === expected[ci] ? "correct" : "incorrect";
                        } else {
                          st = "untyped";
                        }
                      } else {
                        // Beyond expected length → extras: render the TYPED character
                        showChar = input[ci] ?? "";
                        st = "extra";
                      }

                      // Cursor overlay on active word (works both in-body and in extras)
                      if (active && ci === cursorCol) st = "cursor";

                      return (
                        <span
                          key={`${wi}-${ci}`}
                          data-caret={st === "cursor" ? (cursorVisible ? "on" : "off") : undefined}
                          className={clsx(
                            "relative transition-all duration-100 ease-out bk-char",
                            st === "correct" && "text-gray-200",
                            st === "incorrect" && "text-red-400 bg-red-900/40 rounded-md shadow-sm",
                            st === "extra" && "text-orange-300/90 underline decoration-dotted",
                            st === "untyped" && "text-gray-600",
                            st === "cursor" && (cursorVisible ? "bk-caret-on" : "bk-caret-off")
                          )}
                        >
                          {showChar}
                        </span>
                      );
                    })}
                  </span>
                  {wi < evals.length - 1 ? " " : null}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {debug && (
        <div className="mt-4 text-xs text-gray-500">
          Debug: {currentWordIndex}:{cursorCol} | chars: {correctChars}/{totalChars} | line: {wordLineRef.current[currentWordIndex] ?? 0} | visible: {visibleStartLine}-{visibleStartLine + TOTAL_LINES - 1}
          {debugLog.length > 0 && (
            <div className="mt-2 max-h-40 overflow-y-auto bg-gray-900 p-2 rounded text-xs">
              {debugLog.slice(-10).map((entry, i) => (
                <div key={i} className="text-gray-400">
                  [{entry.ts}] {entry.event} @ {entry.wi}:{entry.ci} target="{entry.target}" typed="{entry.typed}" {entry.note}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TypingBox;