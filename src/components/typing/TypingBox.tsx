"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { generateTypingPrompt } from '@/lib/generateText';
import { saveTypingResult } from '@/lib/firebase/scores';
import { RotateCcw } from 'lucide-react';
import clsx from 'clsx';

/* NEW – bring in the modernised Shadcn results panel */
import StatsPanel from './StatsPanel';

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
  onStatsUpdate: (wpm: number, accuracy: number, time: number) => void;
  onTestComplete: (wpm: number, accuracy: number, duration: number) => void;
}

const TypingBox: React.FC<TypingBoxProps> = ({ onStatsUpdate, onTestComplete }) => {
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
  const [finalStats, setFinalStats] = useState<{ wpm: number; accuracy: number; time: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  /* ───────── Load prompt ───────── */
  const loadNewPrompt = useCallback(async () => {
    try {
      setIsLoading(true);
      const generatedText = await generateTypingPrompt({ difficulty: 'medium', topic: 'general' });
      setWords(generatedText.split(' '));

      /* reset */
      setCurrentWordIndex(0);
      setCurrentCharIndex(0);
      setHasStarted(false);
      setStartTime(null);
      setIsComplete(false);
      setCorrectChars(0);
      setTotalChars(0);
      setErrors(new Set());
      setFinalStats(null);
    } catch (error) {
      console.error('Error loading prompt:', error);
      const fallback =
        'The quick brown fox jumps over the lazy dog. This pangram contains every letter of the alphabet and is commonly used for typing practice.';
      setWords(fallback.split(' '));
    } finally {
      setIsLoading(false);
    }
  }, []);

  /* init */
  useEffect(() => {
    if (user) loadNewPrompt();
  }, [user, loadNewPrompt]);

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
        const currentTime = (Date.now() - startTime) / 1000;
        const wpm       = calculateWPM(correctChars, currentTime);
        const accuracy  = calculateAccuracy(correctChars, totalChars);
        onStatsUpdate(wpm, accuracy, currentTime);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [hasStarted, startTime, isComplete, correctChars, totalChars, onStatsUpdate]);

  /* ───────── Keyboard handler ───────── */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!user || isLoading || isComplete) return;

      /* start timer */
      if (!hasStarted && e.key.length === 1) {
        setHasStarted(true);
        setStartTime(Date.now());
      }

      /* restart */
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        loadNewPrompt();
        return;
      }

      /* backspace */
      if (e.key === 'Backspace') {
        e.preventDefault();
        if (currentCharIndex > 0) {
          setCurrentCharIndex((prev) => prev - 1);
          setTotalChars((prev) => Math.max(0, prev - 1));
        } else if (currentWordIndex > 0 && currentCharIndex === 0) {
          setCurrentWordIndex((prev) => prev - 1);
          setCurrentCharIndex(words[currentWordIndex - 1]?.length || 0);
        }
        return;
      }

      /* space */
      if (e.key === ' ') {
        e.preventDefault();
        if (currentWordIndex < words.length - 1) {
          const currentWord     = words[currentWordIndex];
          const remainingChars  = currentWord.length - currentCharIndex;
          if (remainingChars > 0) {
            for (let i = currentCharIndex; i < currentWord.length; i++) {
              setErrors((prev) => new Set([...prev, totalChars + i - currentCharIndex]));
            }
            setTotalChars((prev) => prev + remainingChars);
          }
          setCurrentWordIndex((prev) => prev + 1);
          setCurrentCharIndex(0);
        }
        return;
      }

      /* regular char */
      if (e.key.length === 1) {
        e.preventDefault();
        const currentWord = words[currentWordIndex];
        if (currentCharIndex < currentWord.length) {
          const targetChar = currentWord[currentCharIndex];
          const isCorrect  = e.key === targetChar;

          if (isCorrect) setCorrectChars((prev) => prev + 1);
          else setErrors((prev) => new Set([...prev, totalChars]));

          setTotalChars((prev) => prev + 1);
          setCurrentCharIndex((prev) => prev + 1);

          /* word complete? */
          if (currentCharIndex + 1 === currentWord.length) {
            /* last word? */
            if (currentWordIndex === words.length - 1) {
              const endTime     = Date.now();
              const duration    = (endTime - startTime!) / 1000;
              const finalWpm    = calculateWPM(correctChars + (isCorrect ? 1 : 0), duration);
              const finalAcc    = calculateAccuracy(correctChars + (isCorrect ? 1 : 0), totalChars + 1);

              setFinalStats({ wpm: finalWpm, accuracy: finalAcc, time: duration });
              setIsComplete(true);
              onTestComplete(finalWpm, finalAcc, duration);

              if (user) saveTypingResult(user.uid, finalWpm, finalAcc, duration, 'words', words.length);
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
      loadNewPrompt,
      onTestComplete,
    ]
  );

  /* attach listener */
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  /* status helper */
  const getCharacterStatus = (wordIndex: number, charIndex: number) => {
    if (wordIndex < currentWordIndex) {
      const wordStart = words.slice(0, wordIndex).join(' ').length + (wordIndex > 0 ? 1 : 0);
      return errors.has(wordStart + charIndex) ? 'incorrect' : 'correct';
    } else if (wordIndex === currentWordIndex) {
      if (charIndex < currentCharIndex) {
        const wordStart = words.slice(0, wordIndex).join(' ').length + (wordIndex > 0 ? 1 : 0);
        return errors.has(wordStart + charIndex) ? 'incorrect' : 'correct';
      } else if (charIndex === currentCharIndex) return 'cursor';
      else return 'untyped';
    }
    return 'untyped';
  };

  const handleRestart = () => loadNewPrompt();

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
          <div className="relative text-2xl md:text-3xl lg:text-4xl leading-relaxed text-center font-mono px-8 py-16 min-h-[400px] flex items-center justify-center">
            <div className="max-w-5xl space-y-2">
              {words.map((word, wordIndex) => (
                <React.Fragment key={wordIndex}>
                  <span
                    className={clsx(
                      'inline-block relative mx-1 transition-all duration-200',
                      wordIndex === currentWordIndex &&
                        'bg-yellow-400/10 border border-yellow-400/20 rounded-lg px-2 py-1 -mx-1 shadow-lg shadow-yellow-400/5'
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
                  {wordIndex < words.length - 1 && <span className="text-gray-600 mx-1 select-none"> </span>}
                </React.Fragment>
              ))}
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

        {/* ─────────────────────────────────────────────── */}
        {/* NEW results panel (replaces old grid)          */}
        {isComplete && finalStats && (
          <StatsPanel
            wpm={finalStats.wpm}
            accuracy={finalStats.accuracy}
            time={finalStats.time}
            isTestComplete
            finalWpm={finalStats.wpm}
            finalAccuracy={finalStats.accuracy}
            finalTime={finalStats.time}
          />
        )}
      </div>
    </div>
  );
};

export default TypingBox;
