"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { generateTypingPrompt } from '@/lib/generateText';
import { saveTypingResult } from '@/lib/firebase/scores';
import { RotateCcw } from 'lucide-react';
import clsx from 'clsx';

function calculateWPM(correctChars: number, timeInSeconds: number) {
  if (timeInSeconds === 0) return 0;
  return Math.round((correctChars / 5) / (timeInSeconds / 60));
}

function calculateAccuracy(correctChars: number, totalChars: number) {
  if (totalChars === 0) return 100;
  return Math.round((correctChars / totalChars) * 100);
}

interface TypingBoxProps {
  onStatsUpdate: (wpm: number, accuracy: number, time: number) => void;
  onTestComplete: (wpm: number, accuracy: number, duration: number) => void;
}

const TypingBox: React.FC<TypingBoxProps> = ({ onStatsUpdate, onTestComplete }) => {
  const { user } = useAuth();
  const [words, setWords] = useState<string[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [correctChars, setCorrectChars] = useState(0);
  const [totalChars, setTotalChars] = useState(0);
  const [errors, setErrors] = useState<Set<number>>(new Set());
  const [cursorVisible, setCursorVisible] = useState(true);
  const [finalStats, setFinalStats] = useState<{wpm: number, accuracy: number, time: number} | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Load new text prompt
  const loadNewPrompt = useCallback(async () => {
    try {
      setIsLoading(true);
      const generatedText = await generateTypingPrompt({
        difficulty: 'medium',
        topic: 'general',
      });
      
      setWords(generatedText.split(' '));
      
      // Reset all state
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
      const fallback = "The quick brown fox jumps over the lazy dog. This pangram contains every letter of the alphabet and is commonly used for typing practice.";
      setWords(fallback.split(' '));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    if (user) {
      loadNewPrompt();
    }
  }, [user, loadNewPrompt]);

  // Cursor blinking animation
  useEffect(() => {
    if (!isComplete) {
      const interval = setInterval(() => {
        setCursorVisible(prev => !prev);
      }, 530);
      return () => clearInterval(interval);
    }
  }, [isComplete]);

  // Stats updating
  useEffect(() => {
    if (hasStarted && startTime && !isComplete) {
      const interval = setInterval(() => {
        const currentTime = (Date.now() - startTime) / 1000;
        const wpm = calculateWPM(correctChars, currentTime);
        const accuracy = calculateAccuracy(correctChars, totalChars);
        onStatsUpdate(wpm, accuracy, currentTime);
      }, 100);
      
      return () => clearInterval(interval);
    }
  }, [hasStarted, startTime, isComplete, correctChars, totalChars, onStatsUpdate]);

  // Handle keyboard input
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!user || isLoading || isComplete) return;

    // Start test on first keystroke
    if (!hasStarted && e.key.length === 1) {
      setHasStarted(true);
      setStartTime(Date.now());
    }

    // Handle Tab/Enter to restart
    if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault();
      loadNewPrompt();
      return;
    }

    // Handle backspace
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (currentCharIndex > 0) {
        setCurrentCharIndex(prev => prev - 1);
        setTotalChars(prev => Math.max(0, prev - 1));
      } else if (currentWordIndex > 0 && currentCharIndex === 0) {
        // Go back to previous word
        setCurrentWordIndex(prev => prev - 1);
        setCurrentCharIndex(words[currentWordIndex - 1]?.length || 0);
      }
      return;
    }

    // Handle space (move to next word)
    if (e.key === ' ') {
      e.preventDefault();
      if (currentWordIndex < words.length - 1) {
        // Count remaining characters in current word as errors if not completed
        const currentWord = words[currentWordIndex];
        const remainingChars = currentWord.length - currentCharIndex;
        if (remainingChars > 0) {
          for (let i = currentCharIndex; i < currentWord.length; i++) {
            setErrors(prev => new Set([...prev, totalChars + i - currentCharIndex]));
          }
          setTotalChars(prev => prev + remainingChars);
        }
        
        setCurrentWordIndex(prev => prev + 1);
        setCurrentCharIndex(0);
      }
      return;
    }

    // Handle regular character input
    if (e.key.length === 1) {
      e.preventDefault();
      const currentWord = words[currentWordIndex];
      
      if (currentCharIndex < currentWord.length) {
        const targetChar = currentWord[currentCharIndex];
        const isCorrect = e.key === targetChar;
        
        if (isCorrect) {
          setCorrectChars(prev => prev + 1);
        } else {
          setErrors(prev => new Set([...prev, totalChars]));
        }
        
        setTotalChars(prev => prev + 1);
        setCurrentCharIndex(prev => prev + 1);
        
        // Check if word is complete
        if (currentCharIndex + 1 === currentWord.length) {
          // Check if this is the last word
          if (currentWordIndex === words.length - 1) {
            // Test complete!
            const endTime = Date.now();
            const duration = (endTime - startTime!) / 1000;
            const finalWpm = calculateWPM(correctChars + (isCorrect ? 1 : 0), duration);
            const finalAccuracy = calculateAccuracy(correctChars + (isCorrect ? 1 : 0), totalChars + 1);
            
            // Store final stats to prevent recalculation
            setFinalStats({
              wpm: finalWpm,
              accuracy: finalAccuracy,
              time: duration
            });
            
            setIsComplete(true);
            onTestComplete(finalWpm, finalAccuracy, duration);
            
            // Save to Firebase
            if (user) {
              saveTypingResult(user.uid, finalWpm, finalAccuracy, duration, 'words', words.length);
            }
          }
        }
      }
    }
  }, [user, isLoading, isComplete, hasStarted, startTime, currentWordIndex, currentCharIndex, words, totalChars, correctChars, loadNewPrompt, onTestComplete]);

  // Attach global keyboard listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Get character status for rendering
  const getCharacterStatus = (wordIndex: number, charIndex: number) => {
    if (wordIndex < currentWordIndex) {
      // Already completed word - check if it was typed correctly
      const wordStartIndex = words.slice(0, wordIndex).join(' ').length + (wordIndex > 0 ? 1 : 0);
      const charPosition = wordStartIndex + charIndex;
      return errors.has(charPosition) ? 'incorrect' : 'correct';
    } else if (wordIndex === currentWordIndex) {
      if (charIndex < currentCharIndex) {
        // Already typed in current word
        const wordStartIndex = words.slice(0, wordIndex).join(' ').length + (wordIndex > 0 ? 1 : 0);
        const charPosition = wordStartIndex + charIndex;
        return errors.has(charPosition) ? 'incorrect' : 'correct';
      } else if (charIndex === currentCharIndex) {
        return 'cursor';
      } else {
        return 'untyped';
      }
    } else {
      return 'untyped';
    }
  };

  const handleRestart = () => {
    loadNewPrompt();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative">
            <div className="w-12 h-12 border-2 border-yellow-400/30 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-12 h-12 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div className="text-center space-y-2">
            <p className="text-gray-300 text-lg font-medium">Generating new text...</p>
            <p className="text-gray-500 text-sm">Powered by AI</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4" ref={containerRef}>
      {/* Main Content Container */}
      <div className="w-full max-w-6xl mx-auto space-y-12">
        
        {/* Test Status */}
        {!hasStarted && !isComplete && (
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gray-800/40 backdrop-blur-sm border border-gray-700/30 rounded-2xl">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <p className="text-gray-300 text-sm font-medium">Click to focus, then start typing</p>
            </div>
          </div>
        )}

        {/* Main Typing Display */}
        <div 
          className="relative group cursor-text"
          onClick={() => containerRef.current?.focus()}
          tabIndex={0}
        >
          {/* Typing Area Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-800/20 via-gray-700/10 to-gray-800/20 backdrop-blur-sm rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          {/* Text Content */}
          <div className="relative text-2xl md:text-3xl lg:text-4xl leading-relaxed text-center font-mono px-8 py-16 min-h-[400px] flex items-center justify-center">
            <div className="max-w-5xl space-y-2">
              {words.map((word, wordIndex) => (
                <React.Fragment key={wordIndex}>
                  <span 
                    className={clsx(
                      "inline-block relative mx-1 transition-all duration-200",
                      wordIndex === currentWordIndex && "bg-yellow-400/10 border border-yellow-400/20 rounded-lg px-2 py-1 -mx-1 shadow-lg shadow-yellow-400/5"
                    )}
                  >
                    {word.split('').map((char, charIndex) => {
                      const status = getCharacterStatus(wordIndex, charIndex);
                      return (
                        <span
                          key={`${wordIndex}-${charIndex}`}
                          className={clsx(
                            "relative transition-all duration-100 ease-out",
                            status === 'correct' && "text-gray-200",
                            status === 'incorrect' && "text-red-400 bg-red-900/40 rounded-md shadow-sm",
                            status === 'cursor' && "bg-yellow-400 text-gray-900 rounded-md shadow-md shadow-yellow-400/30",
                            status === 'untyped' && "text-gray-600"
                          )}
                          style={status === 'cursor' ? {
                            backgroundColor: cursorVisible ? '#fbbf24' : 'transparent',
                            color: cursorVisible ? '#111827' : '#6b7280',
                            transform: cursorVisible ? 'scale(1.05)' : 'scale(1)',
                          } : {}}
                        >
                          {char}
                        </span>
                      );
                    })}
                  </span>
                  {wordIndex < words.length - 1 && (
                    <span className="text-gray-600 mx-1 select-none"> </span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Restart Button */}
        {(!hasStarted || isComplete) && (
          <div className="flex justify-center">
            <button
              onClick={handleRestart}
              className="group relative flex items-center justify-center w-16 h-16 bg-gradient-to-br from-gray-800 to-gray-900 hover:from-yellow-500 hover:to-yellow-600 border border-gray-600/30 hover:border-yellow-400/50 rounded-2xl transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-yellow-400/20 focus:outline-none focus:ring-4 focus:ring-yellow-400/30"
            >
              <RotateCcw className="w-6 h-6 text-gray-400 group-hover:text-white transition-all duration-300 group-hover:rotate-180" />
              
              {/* Tooltip */}
              <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-gray-800 text-gray-200 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                New Text
              </div>
            </button>
          </div>
        )}

        {/* Results Display */}
        {isComplete && finalStats && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Main Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              {/* WPM Card */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 to-orange-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                <div className="relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm border border-yellow-400/20 rounded-2xl p-8 text-center hover:border-yellow-400/40 transition-all duration-300">
                  <div className="text-5xl font-bold text-yellow-400 mb-2">
                    {finalStats.wpm}
                  </div>
                  <div className="text-sm text-gray-400 uppercase tracking-wider font-medium">Words per minute</div>
                </div>
              </div>

              {/* Accuracy Card */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 to-emerald-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                <div className="relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm border border-green-400/20 rounded-2xl p-8 text-center hover:border-green-400/40 transition-all duration-300">
                  <div className="text-5xl font-bold text-green-400 mb-2">
                    {finalStats.accuracy}%
                  </div>
                  <div className="text-sm text-gray-400 uppercase tracking-wider font-medium">Accuracy</div>
                </div>
              </div>

              {/* Time Card */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-cyan-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                <div className="relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm border border-blue-400/20 rounded-2xl p-8 text-center hover:border-blue-400/40 transition-all duration-300">
                  <div className="text-5xl font-bold text-blue-400 mb-2">
                    {finalStats.time.toFixed(1)}s
                  </div>
                  <div className="text-sm text-gray-400 uppercase tracking-wider font-medium">Time</div>
                </div>
              </div>
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/30 rounded-xl p-4 text-center hover:border-gray-600/50 transition-all duration-200">
                <div className="font-mono text-2xl text-gray-200 mb-1">
                  {Math.round(finalStats.wpm * 5)}
                </div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Characters</div>
              </div>
              <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/30 rounded-xl p-4 text-center hover:border-gray-600/50 transition-all duration-200">
                <div className="font-mono text-2xl text-red-400 mb-1">
                  {Math.round((100 - finalStats.accuracy) * totalChars / 100)}
                </div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Errors</div>
              </div>
              <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/30 rounded-xl p-4 text-center hover:border-gray-600/50 transition-all duration-200">
                <div className="font-mono text-2xl text-gray-200 mb-1">
                  {words.length}
                </div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Words</div>
              </div>
              <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/30 rounded-xl p-4 text-center hover:border-gray-600/50 transition-all duration-200">
                <div className="font-mono text-2xl text-green-400 mb-1">
                  {Math.round(correctChars)}
                </div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Correct</div>
              </div>
            </div>

            {/* Performance Message */}
            <div className="text-center">
              <div className={clsx(
                "inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-lg font-semibold backdrop-blur-sm border shadow-lg",
                finalStats.wpm >= 60 ? "bg-green-900/30 text-green-300 border-green-700/50 shadow-green-500/20" :
                finalStats.wpm >= 40 ? "bg-yellow-900/30 text-yellow-300 border-yellow-700/50 shadow-yellow-500/20" :
                "bg-red-900/30 text-red-300 border-red-700/50 shadow-red-500/20"
              )}>
                <div className={clsx(
                  "w-3 h-3 rounded-full",
                  finalStats.wpm >= 60 ? "bg-green-400 animate-pulse" :
                  finalStats.wpm >= 40 ? "bg-yellow-400 animate-pulse" :
                  "bg-red-400"
                )}></div>
                {finalStats.wpm >= 60 ? "Outstanding performance! 🔥" :
                 finalStats.wpm >= 40 ? "Great typing speed! ⚡" :
                 "Keep practicing - you've got this! 💪"}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TypingBox;