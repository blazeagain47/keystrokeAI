"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { saveTypingResult } from '@/lib/firebase/scores';
import { RotateCcw } from 'lucide-react';
import clsx from 'clsx';
import { segmentGraphemes, normalizeInputChar } from "@/utils/segments";

/* NEW – bring in the modernised Shadcn results panel */
// Legacy StatsPanel removed in favor of modern ResultsPanel

/* ─────────────────────────────────────────────────────────── */
/* helpers                                                   */
function calculateWPM(correctChars: number, timeInSeconds: number) {
  if (timeInSeconds === 0) return 0;
  return Math.round((correctChars / 5) / (timeInSeconds / 60));
}

function calculateAccuracy(correctChars: number, totalChars: number) {
  if (totalChars === 0) return 100;
  return Math.round((correctChars / totalChars) * 100);
}

/* ─────────────────────────────────────────────────────────── */
/* component                                                 */
interface TypingBoxProps {
  mode: 'words' | 'time';
  durationSec?: number;
  onStatsUpdate: (wpm: number, accuracy: number, time: number) => void;
  onTestComplete: (wpm: number, accuracy: number, duration: number, typedText: string) => void;
  prompt?: string;
  onRequestNewPrompt?: () => void | Promise<void>;
  onRequestAppendPrompt?: () => Promise<string> | string;
}

const TypingBox: React.FC<TypingBoxProps> = ({ mode, durationSec = 15, onStatsUpdate, onTestComplete, prompt, onRequestNewPrompt, onRequestAppendPrompt }) => {
  // Fallback; will be replaced by measured DOM line-height
  const LINE_H = 38; // px fixed line-height for precise viewport math
  // Bigger viewport and center focus
  const VISIBLE_LINES = 5;
  const CENTER_OFFSET = Math.floor(VISIBLE_LINES / 2);
  const { user } = useAuth();

  /* state */
  const [words, setWords]           = useState<string[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isLoading, setIsLoading]   = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [startTime, setStartTime]   = useState<number | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [correctChars, setCorrectChars] = useState(0);
  const [totalChars, setTotalChars] = useState(0);
  const [errors, setErrors]         = useState<Set<number>>(new Set());
  const [cursorVisible, setCursorVisible] = useState(true);
  // const [finalStats, setFinalStats] = useState<{ wpm: number; accuracy: number; time: number } | null>(null);
  const [typedInput, setTypedInput] = useState<string>("");

  const containerRef = useRef<HTMLDivElement>(null);
  const isTabHeldRef = useRef<boolean>(false);
  const lastTabDownAtRef = useRef<number | null>(null);
  const endAtRef = useRef<number | null>(null);
  const lastAppendAtRef = useRef<number>(0);
  // two-line viewport mechanics
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const lineHeightRef = useRef<number>(0);
  const firstLineTopRef = useRef<number>(0);
  const [visibleStartLine, setVisibleStartLine] = useState(0);
  const wordLineRef = useRef<number[]>([]);
  const lastLineRef = useRef<number>(0);
  const baseTopRef = useRef<number>(0);
  const lineEndsRef = useRef<number[]>([]);

  const clampTop = useCallback((top: number) => {
    const totalLines = lineEndsRef.current.length || 0;
    const maxTop = Math.max(0, totalLines - VISIBLE_LINES);
    return Math.max(0, Math.min(top, maxTop));
  }, []);

  /* ───────── Load prompt from prop ───────── */
  const resetFromPrompt = useCallback((text: string) => {
    setIsLoading(true);
    const nextWords = text.split(/\s+/).filter(Boolean);
    setWords(nextWords);
    setCurrentWordIndex(0);
    setCurrentCharIndex(0);
    setHasStarted(false);
    setStartTime(null);
    setIsComplete(false);
    setCorrectChars(0);
    setTotalChars(0);
    setErrors(new Set());
    setTypedInput("");
    setIsLoading(false);
    // reset two-line viewport position
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

  // Measure real line-height and size viewport precisely (no padding).
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      computeWordLines();

      // Find first tokens of line 0 and 1
      let firstIdx0 = -1, firstIdx1 = -1;
      const wl = wordLineRef.current;
      for (let i = 0; i < wl.length; i++) {
        if (wl[i] === 0 && firstIdx0 === -1) firstIdx0 = i;
        if (wl[i] === 1 && firstIdx1 === -1) firstIdx1 = i;
        if (firstIdx0 !== -1 && firstIdx1 !== -1) break;
      }

      let measuredLH = LINE_H;
      const el0 = firstIdx0 !== -1 ? wordRefs.current[firstIdx0] : null;
      const el1 = firstIdx1 !== -1 ? wordRefs.current[firstIdx1] : null;
      if (el0 && el1) {
        measuredLH = Math.round(el1.offsetTop - el0.offsetTop) || LINE_H;
      } else {
        const any = el0 || wordRefs.current[0];
        if (any) {
          const lh = parseFloat(getComputedStyle(any).lineHeight);
          if (!Number.isNaN(lh)) measuredLH = Math.round(lh);
        }
      }

      lineHeightRef.current = measuredLH;
      firstLineTopRef.current = el0 ? el0.offsetTop : 0;
      setVisibleStartLine(0);

      if (viewportRef.current) {
        viewportRef.current.style.paddingTop = '0px';
        viewportRef.current.style.paddingBottom = '0px';
        viewportRef.current.style.height = `${VISIBLE_LINES * measuredLH}px`;
      }
      if (contentRef.current) {
        contentRef.current.style.transform = `translateY(0px)`;
        contentRef.current.style.willChange = 'transform';
      }
    });
    return () => cancelAnimationFrame(id);
  }, [prompt, computeWordLines]);

  /* cursor blink */
  useEffect(() => {
    if (!isComplete) {
      const interval = setInterval(() => setCursorVisible((prev) => !prev), 530);
      return () => clearInterval(interval);
    }
  }, [isComplete]);

  /* live stats update */
  useEffect(() => {
    if (hasStarted && startTime && !isComplete) {
      const interval = setInterval(() => {
        const now = Date.now();
        const currentTime = (now - startTime) / 1000;
        const wpm       = calculateWPM(correctChars, currentTime);
        const accuracy  = calculateAccuracy(correctChars, totalChars);
        onStatsUpdate(wpm, accuracy, currentTime);
        if (mode === 'time' && endAtRef.current && now >= endAtRef.current) {
          const finalWpm = calculateWPM(correctChars, currentTime);
          const finalAcc = calculateAccuracy(correctChars, totalChars);
          setIsComplete(true);
          onTestComplete(finalWpm, finalAcc, currentTime, typedInput);
        }
      }, 250);
      return () => clearInterval(interval);
    }
  }, [hasStarted, startTime, isComplete, correctChars, totalChars, onStatsUpdate, mode, onTestComplete, typedInput]);

  /* auto-advance viewport so current line is centered within the viewport */
  useEffect(() => {
    const line = wordLineRef.current[currentWordIndex] ?? 0;
    // Center the active line within the viewport
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
  }, [currentWordIndex, visibleStartLine, clampTop]);

  /* ───────── Keyboard handler ───────── */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!user || isLoading || isComplete) return;

      /* start timer */
      if (!hasStarted && e.key.length === 1) {
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
          if (onRequestNewPrompt) {
            void onRequestNewPrompt();
          } else if (prompt) {
            resetFromPrompt(prompt);
          }
          return;
        }
      }

      const pushStats = (correctDelta = 0, totalDelta = 0) => {
        if (hasStarted && startTime && !isComplete) {
          const now = Date.now();
          const currentTime = (now - startTime) / 1000;
          const wpmNow = calculateWPM(correctChars + correctDelta, currentTime);
          const accNow = calculateAccuracy(correctChars + correctDelta, totalChars + totalDelta);
          onStatsUpdate(wpmNow, accNow, currentTime);
        }
      };

      /* backspace */
      if (e.key === 'Backspace') {
        e.preventDefault();
        // Update typed input
        setTypedInput((prev) => (prev.length > 0 ? prev.slice(0, -1) : prev));
        if (currentCharIndex > 0) {
          setCurrentCharIndex((prev) => prev - 1);
          setTotalChars((prev) => Math.max(0, prev - 1));
          pushStats(0, -1);
    } else if (currentWordIndex > 0 && currentCharIndex === 0) {
          setCurrentWordIndex((prev) => prev - 1);
          const prevWord = words[currentWordIndex - 1] || "";
          setCurrentCharIndex(segmentGraphemes(prevWord).length || 0);
          pushStats();
        }
        return;
      }

      /* space */
      if (e.key === ' ') {
        e.preventDefault();
        // Append space to typed input
        setTypedInput((prev) => prev + ' ');

        // Snap shift by one line but re-center around the next active line
        const topEndIdx = lineEndsRef.current[visibleStartLine] ?? -1;
        if (currentWordIndex === topEndIdx) {
          // Snap shift to keep motion crisp; effect above will keep it centered
          const nextLine = wordLineRef.current[currentWordIndex + 1] ?? (visibleStartLine + CENTER_OFFSET);
          const nextTop = clampTop(nextLine - CENTER_OFFSET);
          setVisibleStartLine(nextTop);
          if (contentRef.current) {
            const lh = lineHeightRef.current || LINE_H;
            const px = Math.round(nextTop * lh);
            contentRef.current.style.transform = `translateY(-${px}px)`;
          }
        }

        if (currentWordIndex < words.length - 1) {
          const currentWord     = words[currentWordIndex];
          const g = segmentGraphemes(currentWord);
          const remainingChars  = g.length - currentCharIndex;
          if (remainingChars > 0) {
            for (let i = currentCharIndex; i < g.length; i++) {
              setErrors((prev) => new Set([...prev, totalChars + i - currentCharIndex]));
            }
            setTotalChars((prev) => prev + remainingChars);
            pushStats(0, remainingChars);
          }
          setCurrentWordIndex((prev) => prev + 1);
          setCurrentCharIndex(0);
        }
        return;
      }

      /* Auto-extend prompt in time mode when near the end */
      if (mode === 'time') {
        const remainingWords = words.length - currentWordIndex;
        const now = Date.now();
        if (remainingWords < 30 && onRequestAppendPrompt && now - lastAppendAtRef.current > 5000) {
          lastAppendAtRef.current = now;
          Promise.resolve(onRequestAppendPrompt()).then((extra) => {
            if (!extra) return;
            const more = extra.split(/\s+/).filter(Boolean);
            setWords((prev) => [...prev, ...more]);
            // recompute line map on next frame after DOM updates
            requestAnimationFrame(() => {
              computeWordLines();
            });
          }).catch(() => {});
        }
      }

      /* regular char */
      if (e.key.length === 1) {
        e.preventDefault();
        const currentWord = words[currentWordIndex];
        const g = segmentGraphemes(currentWord);
        if (currentCharIndex < g.length) {
          const targetChar = g[currentCharIndex];
          const typedCharNorm = normalizeInputChar(e.key);
          const isCorrect  = typedCharNorm === targetChar;
          // Record typed character
          setTypedInput((prev) => prev + typedCharNorm);

          if (isCorrect) setCorrectChars((prev) => prev + 1);
          else setErrors((prev) => new Set([...prev, totalChars]));

          setTotalChars((prev) => prev + 1);
          setCurrentCharIndex((prev) => prev + 1);
          pushStats(isCorrect ? 1 : 0, 1);

          /* word complete? */
          if (currentCharIndex + 1 === g.length) {
            if (mode === 'words') {
              /* last word? */
              if (currentWordIndex === words.length - 1) {
                const endTime     = Date.now();
                const duration    = (endTime - startTime!) / 1000;
                const finalWpm    = calculateWPM(correctChars + (isCorrect ? 1 : 0), duration);
                const finalAcc    = calculateAccuracy(correctChars + (isCorrect ? 1 : 0), totalChars + 1);
                setIsComplete(true);
                onTestComplete(finalWpm, finalAcc, duration, typedInput + e.key);
                if (user) saveTypingResult(user.uid, finalWpm, finalAcc, duration, 'words', words.length);
              }
            }
          }
        }
      }
    },
    [
      user,
      isLoading,
      isComplete,
      hasStarted,
      startTime,
      currentWordIndex,
      currentCharIndex,
      words,
      totalChars,
      correctChars,
      onTestComplete,
      prompt,
      resetFromPrompt,
      typedInput,
      onRequestNewPrompt,
      mode,
      durationSec,
    ]
  );

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      isTabHeldRef.current = false;
    }
  }, []);

  /* attach listener */
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  /* status helper – index-accurate using typedInput + error set for skipped chars */
  const getCharacterStatus = (wordIndex: number, charIndex: number) => {
    // Caret
    if (wordIndex === currentWordIndex && charIndex === currentCharIndex) return 'cursor';

    // Global stream index for this character
    const wordStart = words.slice(0, wordIndex).join(' ').length + (wordIndex > 0 ? 1 : 0);
    const streamIndex = wordStart + charIndex;

    // If we explicitly marked this character as incorrect (including skipped-on-space), honor it
    if (errors.has(streamIndex)) return 'incorrect';

    // Compare typed character at this absolute index to target
    const typedChar = typedInput[streamIndex];
    if (typedChar == null) return 'untyped';

    const targetWord = words[wordIndex] ?? '';
    const targetChar = targetWord[charIndex];
    return typedChar === targetChar ? 'correct' : 'incorrect';
  };

  const handleRestart = () => {
    if (onRequestNewPrompt) {
      void onRequestNewPrompt();
    } else if (prompt) {
      resetFromPrompt(prompt);
    }
  };

  /* ──────────────────────────────────────────────────────────── */
  /* render                                                     */
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative">
            <div className="w-12 h-12 border-2 border-yellow-400/30 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-12 h-12 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div className="text-center space-y-2">
            <p className="text-gray-300 text-lg font-medium">Generating new text…</p>
            <p className="text-gray-500 text-sm">Powered by AI</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4" ref={containerRef}>
      <div className="w-full max-w-6xl mx-auto space-y-12">
        {/* status info */}
        {!hasStarted && !isComplete && (
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gray-800/40 backdrop-blur-sm border border-gray-700/30 rounded-2xl">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <p className="text-gray-300 text-sm font-medium">Click to focus, then start typing</p>
            </div>
          </div>
        )}

        {/* typing display */}
        <div
          className="relative group cursor-text"
          onClick={() => containerRef.current?.focus()}
          tabIndex={0}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-gray-800/20 via-gray-700/10 to-gray-800/20 backdrop-blur-sm rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative text-2xl md:text-3xl lg:text-4xl leading-relaxed font-mono px-8 py-10">
            {/* Fixed-height two-line viewport */}
            <div ref={viewportRef} className="relative overflow-hidden typing-viewport">
              {/* optional fades removed for floating-on-canvas look */}
              <div ref={contentRef} className="transition-transform duration-200 ease-out translate-z-0 typing-content">
                <div className="max-w-6xl whitespace-normal break-words tracking-normal leading-[1.35]">
                  {words.map((word, wordIndex) => (
                    <React.Fragment key={wordIndex}>
                      <span
                        ref={(el) => {
                          wordRefs.current[wordIndex] = el;
                        }}
                        className={clsx(
                          'inline align-baseline relative transition-all duration-200',
                          wordIndex === currentWordIndex &&
                            'bg-yellow-400/10 border border-yellow-400/20 rounded-lg shadow-lg shadow-yellow-400/5'
                        )}
                      >
                        {word.split('').map((char, charIndex) => {
                          const status = getCharacterStatus(wordIndex, charIndex);
                          return (
                            <span
                              key={`${wordIndex}-${charIndex}`}
                              className={clsx(
                                'relative transition-all duration-100 ease-out',
                                status === 'correct' && 'text-gray-200',
                                status === 'incorrect' && 'text-red-400 bg-red-900/40 rounded-md shadow-sm',
                                status === 'cursor' &&
                                  'bg-yellow-400 text-gray-900 rounded-md shadow-md shadow-yellow-400/30',
                                status === 'untyped' && 'text-gray-600'
                              )}
                              style={
                                status === 'cursor'
                                  ? {
                                      backgroundColor: cursorVisible ? '#fbbf24' : 'transparent',
                                      color: cursorVisible ? '#111827' : '#6b7280',
                                      transform: cursorVisible ? 'scale(1.05)' : 'scale(1)',
                                    }
                                  : {}
                              }
                            >
                              {char}
                            </span>
                          );
                        })}
                      </span>
                      {wordIndex < words.length - 1 ? ' ' : null}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* restart button */}
        {(!hasStarted || isComplete) && (
          <div className="flex justify-center">
            <button
              onClick={handleRestart}
              className="group relative flex items-center justify-center w-16 h-16 bg-gradient-to-br from-gray-800 to-gray-900 hover:from-yellow-500 hover:to-yellow-600 border border-gray-600/30 hover:border-yellow-400/50 rounded-2xl transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-yellow-400/20 focus:outline-none focus:ring-4 focus:ring-yellow-400/30"
            >
              <RotateCcw className="w-6 h-6 text-gray-400 group-hover:text-white transition-all duration-300 group-hover:rotate-180" />
              <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-gray-800 text-gray-200 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                New Text
              </div>
            </button>
          </div>
        )}

        {/* Results rendering moved to parent ResultsPanel */}
      </div>
    </div>
  );
};

export default TypingBox;
