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
  const [prompt, setPrompt] = useState('');
  const [words, setWords] = useState<string[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [correctChars, setCorrectChars] = useState(0);
  const [totalChars, setTotalChars] = useState(0);
  const [errors, setErrors] = useState<Set<number>>(new Set());
  const [cursorVisible, setCursorVisible] = useState(true);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Load new text prompt
  const loadNewPrompt = useCallback(async () => {
    try {
      setIsLoading(true);
      const generatedText = await generateTypingPrompt({
        difficulty: 'medium',
        topic: 'general',
      });
      
      setPrompt(generatedText);
      setWords(generatedText.split(' '));
      
      // Reset all state
      setCurrentWordIndex(0);
      setCurrentCharIndex(0);
      setTypedText('');
      setHasStarted(false);
      setStartTime(null);
      setIsComplete(false);
      setCorrectChars(0);
      setTotalChars(0);
      setErrors(new Set());
      
    } catch (error) {
      console.error('Error loading prompt:', error);
      const fallback = "The quick brown fox jumps over the lazy dog in the park";
      setPrompt(fallback);
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
    const interval = setInterval(() => {
      setCursorVisible(prev => !prev);
    }, 530);
    return () => clearInterval(interval);
  }, []);

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
        setTypedText(prev => prev.slice(0, -1));
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
        setTypedText(prev => prev + ' ');
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
        setTypedText(prev => prev + e.key);
        
        // Check if word is complete
        if (currentCharIndex + 1 === currentWord.length) {
          // Check if this is the last word
          if (currentWordIndex === words.length - 1) {
            // Test complete!
            const endTime = Date.now();
            const duration = (endTime - startTime!) / 1000;
            const finalWpm = calculateWPM(correctChars + (isCorrect ? 1 : 0), duration);
            const finalAccuracy = calculateAccuracy(correctChars + (isCorrect ? 1 : 0), totalChars + 1);
            
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400">Loading new text...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6" ref={containerRef}>
      {/* Modern Typing Console */}
      <div className="w-full max-w-4xl mx-auto">
        {/* Typing Area */}
        <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 mb-8 shadow-2xl">
          <div 
            className="text-2xl leading-relaxed font-mono select-none focus:outline-none"
            style={{ 
              lineHeight: '2.5',
              letterSpacing: '0.02em',
              fontFamily: "'JetBrains Mono', 'Consolas', monospace"
            }}
            tabIndex={0}
          >
            {words.map((word, wordIndex) => (
              <span key={wordIndex} className="inline-block mr-3">
                {word.split('').map((char, charIndex) => {
                  const status = getCharacterStatus(wordIndex, charIndex);
                  return (
                    <span
                      key={`${wordIndex}-${charIndex}`}
                      className={clsx(
                        "relative transition-all duration-75",
                        status === 'correct' && "text-gray-200",
                        status === 'incorrect' && "text-red-400 bg-red-900/40 rounded-sm",
                        status === 'cursor' && "bg-yellow-400 text-gray-900 rounded-sm",
                        status === 'untyped' && "text-gray-500"
                      )}
                      style={status === 'cursor' ? {
                        backgroundColor: cursorVisible ? '#fbbf24' : 'transparent',
                        color: cursorVisible ? '#111827' : '#6b7280',
                      } : {}}
                    >
                      {char}
                    </span>
                  );
                })}
              </span>
            ))}
          </div>
        </div>

        {/* Restart Button */}
        <div className="flex justify-center">
          <button
            onClick={handleRestart}
            className="group flex items-center justify-center w-12 h-12 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/50 rounded-full transition-all duration-200 hover:scale-110"
          >
            <RotateCcw className="w-5 h-5 text-gray-400 group-hover:text-yellow-400 transition-colors" />
          </button>
        </div>
      </div>

      {/* Test Complete Modal */}
      {isComplete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 shadow-2xl">
            <h3 className="text-2xl font-bold text-white mb-4">Test Complete!</h3>
            <div className="grid grid-cols-3 gap-6 mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400">
                  {calculateWPM(correctChars, (Date.now() - startTime!) / 1000)}
                </div>
                <div className="text-sm text-gray-400">WPM</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400">
                  {calculateAccuracy(correctChars, totalChars)}%
                </div>
                <div className="text-sm text-gray-400">Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400">
                  {((Date.now() - startTime!) / 1000).toFixed(1)}s
                </div>
                <div className="text-sm text-gray-400">Time</div>
              </div>
            </div>
            <button
              onClick={handleRestart}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TypingBox;