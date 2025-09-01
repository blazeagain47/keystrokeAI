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
import { useStopOnError, useStrictSpace, useSettingsStore } from "@/store/settings";
import { useUIStore } from "@/stores/useUIStore";
import EmbersLayer, { EmbersHandle } from "@/components/fx/EmbersLayer";
import { useSearchParams } from "next/navigation";
import { tl } from "@/lib/timeline";
import { devLog } from "@/lib/devLog";
import useLockScroll from "@/hooks/useLockScroll";
import { useInputLatencyProbe } from "@/hooks/useInputLatencyProbe";
import { officialWpm, accuracy as accFn } from "@/lib/statsMath";
import { computeWordLineLayout, calculateViewportTop, applyViewportTransform, VISIBLE_LINES, type LineLayout } from "@/lib/textLayout";
import { useReducedMotion } from "framer-motion";
import { weakspot } from "@/ai/weakspot";

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
  // Scale used for all typing prompts (visual-only; no layout reflow)
  const PROMPT_SCALE = 1.3; // ≈ +30%

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
  const [lineLayout, setLineLayout] = useState<LineLayout>({ wordIndexToLine: [], totalLines: 0, lineHeight: 38 });
  
  // Append buffer state
  const appendBusyRef = useRef(false);
  const prefersReducedMotion = useReducedMotion();

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
  const lastDownAtRef = useRef<number | null>(null);
  const lastCharRef = useRef<string | null>(null);
  const nowTs = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

  // keep center-of-window invariant no matter the mode
  const TOTAL_LINES = 3;
  const CENTER_OFFSET = 1; // active line stays centered: 0 (top), 1 (middle), 2 (bottom)

  // for time mode: keep a trailing buffer so we never run out of words
  const APPEND_THRESHOLD_WORDS = 40;  // when within 40 words of the end, append more
  const APPEND_CHUNK_DEFAULT = 120;   // how many words to append per fetch
  const appendingRef = useRef(false);

  // Safe spacing so filters/header never overlap the typing viewport
  const SAFE_TOP_PX = 140;   // top spacer (tune if your header/filters grow)
  const SAFE_BOTTOM_PX = 48; // bottom breathing room to avoid clipping

  // Gates centering/transform until after we have real measurements
  const [measured, setMeasured] = React.useState(false);

  // Lock page scroll any time the typing screen is visible.
  // Pre-test (not started) -> locked
  // Active run -> locked
  // Post-test/results (isComplete) -> unlocked
  const scrollLocked = !isComplete;
  useLockScroll(scrollLocked);
  const devProbe = process.env.NEXT_PUBLIC_DEV_PROBE === "1";
  useInputLatencyProbe(devProbe, [currentWordIndex, cursorCol]);

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
    appendingRef.current = false;
    if (contentRef.current) {
      contentRef.current.style.transform = "translateY(0px)";
    }
  }, []);

  // Settings flags
  const stopOnError = useStopOnError();
  const strictSpace = useStrictSpace();
  const overlayOpen = useUIStore(s => s.overlayOpen);
  const setFocus = useUIStore(s => s.setFocus);
  const focusEnabled = useSettingsStore(s => s.focus.enabled);
  const exitOnMouseMove = useSettingsStore(s => s.focus.exitOnMouseMove);
  const isFocus = useUIStore(s => s.isFocus);

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

  const appendMoreWordsIfNeeded = useCallback(async (wi: number) => {
    if (mode !== 'time') return;
    const remaining = (words.length - 1) - wi;
    if (remaining > APPEND_THRESHOLD_WORDS) return;
    if (appendingRef.current) return;
    // only append if a callback is provided
    if (!onRequestAppendPrompt) return;

    try {
      appendingRef.current = true;
      const extra = await onRequestAppendPrompt();
      if (!extra || !extra.trim()) return;
      const add = extra.split(/\s+/).filter(Boolean);
      if (!add.length) return;

      // append words and expand input slots
      setWords(prev => prev.concat(add));
      setInputWords(prev => prev.concat(Array(add.length).fill("")));
      // line map gets recomputed by existing effects when `words` changes
    } finally {
      appendingRef.current = false;
    }
  }, [mode, words.length, onRequestAppendPrompt]);

  const clampTop = useCallback((top: number) => {
    const maxLines = Math.max(1, lineLayout.totalLines);
    const maxStart = Math.max(0, maxLines - TOTAL_LINES);
    return Math.max(0, Math.min(maxStart, top));
  }, [lineLayout.totalLines]);

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
    appendingRef.current = false;
    try { weakspot.resetRun(); } catch {}
    lastDownAtRef.current = null;
    lastCharRef.current = null;
  }, []);

  /* init & prop change */
  useEffect(() => {
    if (prompt && prompt.length > 0) {
      resetFromPrompt(prompt);
    }
  }, [prompt, resetFromPrompt]);

  /* util to compute per-word line mapping using unified layout */
  const computeWordLines = useCallback(() => {
    const measureWord = (wordIndex: number) => {
      const el = wordRefs.current[wordIndex];
      if (!el) return null;
      
      const rect = el.getBoundingClientRect();
      const containerRect = contentRef.current?.getBoundingClientRect();
      if (!containerRect) return null;
      
      return {
        left: rect.left - containerRect.left,
        top: el.offsetTop,
        lineHeight: lineHeightRef.current || LINE_H
      };
    };

    const newLayout = computeWordLineLayout(words, measureWord);
    setLineLayout(newLayout);
    
    // Keep legacy refs for compatibility
    wordLineRef.current = newLayout.wordIndexToLine;
    const ends: number[] = [];
    newLayout.wordIndexToLine.forEach((ln, idx) => { ends[ln] = idx; });
    lineEndsRef.current = ends;
  }, [words, LINE_H]);

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
    const wpm = Math.round(officialWpm(tally.correct, elapsed * 1000));
    const acc = Math.round(accFn(tally.correct, tally.incorrect, 0, tally.extra));
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
          const finalWpm = Math.round(officialWpm(tally.correct, elapsed * 1000));
          const finalAcc = Math.round(accFn(tally.correct, tally.incorrect, 0, tally.extra));
          setIsComplete(true);
          onTestComplete(finalWpm, finalAcc, elapsed, (inputWords || []).join(' '));
          try { weakspot.commitRun(); } catch {}
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [hasStarted, startTime, isComplete, evals, mode, onTestComplete, inputWords, durationSec, pushStats]);

  useEffect(() => {
    if (!measured) return;
    const line = wordLineRef.current[currentWordIndex] ?? 0;
    const desiredTop = clampTop(line - CENTER_OFFSET);

    if (desiredTop !== visibleStartLine) {
      setVisibleStartLine(desiredTop);
      const el = contentRef.current;
      if (el) {
        const lh = lineHeightRef.current || LINE_H;
        const px = Math.round(desiredTop * lh * PROMPT_SCALE);
        requestAnimationFrame(() => { el.style.transform = `translateY(-${px}px)`; });
      }
    }
    lastLineRef.current = line;
  }, [measured, currentWordIndex, visibleStartLine, clampTop, runSeq, mode]);



  /* Debounced resize handler to keep layout fresh */
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (measured && words.length > 0) {
          computeWordLines();
        }
      }, 100);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, [measured, words.length, computeWordLines]);

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
    const finalWpm = Math.round(officialWpm(tally.correct, elapsedSec * 1000));
    const finalAcc = Math.round(accFn(tally.correct, tally.incorrect, 0, tally.extra));
    setIsComplete(true);
    onTestComplete(finalWpm, finalAcc, elapsedSec, (inputWords || []).join(' '));
    try { weakspot.commitRun(); } catch {}
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
        // advance anchor for flight timing (optional)
        lastDownAtRef.current = nowTs();
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

        // 4) Advance to next word
        if (wi >= words.length - 1) {
          if (mode === 'words') {
            // words mode can finish by space on last word
            finishedBySpace = true;
            wi = words.length;
            continue;
          } else {
            // time mode: ensure buffer exists, then advance
            void appendMoreWordsIfNeeded(wi);
          }
        }
        wi = Math.min(wi + 1, words.length - 1);
        col = (nextWords[wi] ?? "").length; // place caret at start-of-next (or after any existing input)
        spawnAtCaret(3);
        // advance anchor for flight timing (optional)
        lastDownAtRef.current = nowTs();
        lastCharRef.current = ' ';
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
        // AI Coach: per-keystroke observation (no behavior change)
        try {
          const ts = nowTs();
          weakspot.noteKeystroke({
            char: ch,
            correct: st === "correct",
            tsDown: ts,
            tsPrevDown: lastDownAtRef.current ?? undefined,
            prevChar: lastCharRef.current ?? undefined,
          });
          lastDownAtRef.current = ts;
          lastCharRef.current = ch;
        } catch {}
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

    if (mode === 'time') {
      // keep a healthy suffix of words available
      void appendMoreWordsIfNeeded(wi);
    }

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
      const wpm = Math.round(officialWpm(tally.correct, elapsed * 1000));
      const acc = Math.round(accFn(tally.correct, tally.incorrect, 0, tally.extra));
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
        const finalWpm = Math.round(officialWpm(tally.correct, elapsed * 1000));
        const finalAcc = Math.round(accFn(tally.correct, tally.incorrect, 0, tally.extra));
        setIsComplete(true);
        onTestComplete(finalWpm, finalAcc, elapsed, nextWords.join(' '));
      }
    }
  }, [inputWords, currentWordIndex, cursorCol, hasStarted, startTime, isComplete, words, mode, onStatsUpdate, onTestComplete, stopOnError, finalizeWordsRun]);

  const enqueueKey = useMemo(() => createRafQueue<string>(applyBatch), [applyBatch]);

  /* ───────── Keyboard handler ───────── */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Allow ESC to exit focus (do not prevent default; let modals handle too)
      if (e.key === 'Escape') {
        if (!overlayOpen) { try { setFocus(false); } catch {} }
        return;
      }
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
        // Enter focus mode if enabled and no overlay is open
        if (focusEnabled && !overlayOpen) { try { setFocus(true); } catch {} }
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
      try { setFocus(false); } catch {}
    };
  }, [handleKeyDown, handleKeyUp]);

  // Optional: exit focus on first mouse move during an active run
  useEffect(() => {
    if (!focusEnabled || !exitOnMouseMove) return;
    if (!hasStarted || isComplete) return;
    if (!isFocus) return;
    const onMove = () => { try { setFocus(false); } catch {} ; window.removeEventListener('mousemove', onMove as any); };
    try { window.addEventListener('mousemove', onMove as any, { once: true, passive: true } as AddEventListenerOptions); } catch { window.addEventListener('mousemove', onMove as any); }
    return () => { try { window.removeEventListener('mousemove', onMove as any); } catch {} };
  }, [focusEnabled, exitOnMouseMove, hasStarted, isComplete, isFocus, setFocus]);

  // Use CSS-only blink to avoid extra renders
  useEffect(() => { setCursorVisible(true); }, []);

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
      className="mx-auto max-w-7xl px-4 sm:px-6"
      style={{
        minHeight: "100svh",
        contain: "layout style paint",
      }}
    >
      {/* Top spacer so filters/header never overlap the typing viewport */}
      <div aria-hidden className="pointer-events-none" style={{ height: SAFE_TOP_PX }} />

      {/* Fixed 3-line window; +2px buffer avoids bottom clipping on fractional line-heights */}
      <div
        data-bk-viewport
        className="overflow-hidden rounded-xl select-none"
        style={{
          height: `${Math.round((TOTAL_LINES * (lineHeightRef.current || LINE_H)) * PROMPT_SCALE) + 2}px`,
          overscrollBehavior: scrollLocked ? "none" : "auto",
          ["--bk-viewport-mask" as any]: PROMPT_SCALE > 1 ? '0px' : '4px',
        }}
        onWheelCapture={scrollLocked ? (e) => e.preventDefault() : undefined}
        onTouchMoveCapture={scrollLocked ? (e) => e.preventDefault() : undefined}
      >
        <div
          ref={contentRef}
          data-bk-content
          className="relative transition-transform duration-200 ease-out"
          style={{
            lineHeight: `${lineHeightRef.current || LINE_H}px`,
            fontSize: "1.1rem",
            fontFamily:
              'JetBrains Mono, Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
            paddingBottom: SAFE_BOTTOM_PX,
            willChange: scrollLocked ? "transform" : "auto",
            ["--bk-prompt-scale" as any]: PROMPT_SCALE,
          }}
        >
          <div className="bk-prompt-scale-wrap">
            <div
              className="px-4 leading-relaxed text-lg bk-prompt-scale"
            >
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