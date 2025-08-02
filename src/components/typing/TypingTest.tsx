"use client"

import React, { useState } from 'react';
import TypingBox from './TypingBox';
import { 
  Clock, 
  Hash,
  AtSign,
  Quote,
  Triangle,
  Wrench,
  Globe,
  Zap,
  Target,
  Timer
} from 'lucide-react';
import clsx from 'clsx';

const TypingTest: React.FC = () => {
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [time, setTime] = useState(0);
  const [isTestComplete, setIsTestComplete] = useState(false);

  // Test configuration state
  const [testMode, setTestMode] = useState<'time' | 'words' | 'quote' | 'zen' | 'custom'>('words');
  const [testDuration, setTestDuration] = useState(15);
  const [wordCount, setWordCount] = useState(50);
  const [showPunctuation, setShowPunctuation] = useState(false);
  const [showNumbers, setShowNumbers] = useState(false);

  const handleStatsUpdate = (newWpm: number, newAccuracy: number, newTime: number) => {
    setWpm(newWpm);
    setAccuracy(newAccuracy);
    setTime(newTime);
    setIsTestComplete(false);
  };

  const handleTestComplete = (finalWpm: number, finalAccuracy: number, finalTime: number) => {
    setIsTestComplete(true);
    setWpm(finalWpm);
    setAccuracy(finalAccuracy);
    setTime(finalTime);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Top Navigation/Filter Bar */}
      <div className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800/50 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-6">
          
          {/* Main Mode Selection */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            {/* Special Features */}
            <button 
              className={clsx(
                "group relative px-5 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 hover:scale-105 flex items-center gap-2 shadow-lg",
                showPunctuation 
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 shadow-yellow-400/25 hover:shadow-yellow-400/40' 
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/60 border border-gray-700/30 hover:border-gray-600/50 backdrop-blur-sm'
              )}
              onClick={() => setShowPunctuation(!showPunctuation)}
            >
              <AtSign className="h-4 w-4" />
              punctuation
              {showPunctuation && <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>}
            </button>
            
            <button 
              className={clsx(
                "group relative px-5 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 hover:scale-105 flex items-center gap-2 shadow-lg",
                showNumbers 
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 shadow-yellow-400/25 hover:shadow-yellow-400/40' 
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/60 border border-gray-700/30 hover:border-gray-600/50 backdrop-blur-sm'
              )}
              onClick={() => setShowNumbers(!showNumbers)}
            >
              <Hash className="h-4 w-4" />
              numbers
              {showNumbers && <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>}
            </button>
            
            {/* Separator */}
            <div className="w-px h-8 bg-gradient-to-b from-transparent via-gray-600/50 to-transparent mx-3"></div>
            
            {/* Test Modes */}
            <button 
              className={clsx(
                "group relative px-5 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 hover:scale-105 flex items-center gap-2 shadow-lg",
                testMode === 'time' 
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-blue-500/25 hover:shadow-blue-500/40' 
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/60 border border-gray-700/30 hover:border-gray-600/50 backdrop-blur-sm'
              )}
              onClick={() => setTestMode('time')}
            >
              <Clock className="h-4 w-4" />
              time
            </button>
            
            <button 
              className={clsx(
                "group relative px-5 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 hover:scale-105 flex items-center gap-2 shadow-lg",
                testMode === 'words' 
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-purple-500/25 hover:shadow-purple-500/40' 
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/60 border border-gray-700/30 hover:border-gray-600/50 backdrop-blur-sm'
              )}
              onClick={() => setTestMode('words')}
            >
              <span className="text-lg font-bold">A</span>
              words
            </button>
            
            <button 
              className={clsx(
                "group relative px-5 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 hover:scale-105 flex items-center gap-2 shadow-lg",
                testMode === 'quote' 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/25 hover:shadow-emerald-500/40' 
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/60 border border-gray-700/30 hover:border-gray-600/50 backdrop-blur-sm'
              )}
              onClick={() => setTestMode('quote')}
            >
              <Quote className="h-4 w-4" />
              quote
            </button>
            
            <button 
              className={clsx(
                "group relative px-5 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 hover:scale-105 flex items-center gap-2 shadow-lg",
                testMode === 'zen' 
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-indigo-500/25 hover:shadow-indigo-500/40' 
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/60 border border-gray-700/30 hover:border-gray-600/50 backdrop-blur-sm'
              )}
              onClick={() => setTestMode('zen')}
            >
              <Triangle className="h-4 w-4" />
              zen
            </button>
            
            <button 
              className={clsx(
                "group relative px-5 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 hover:scale-105 flex items-center gap-2 shadow-lg",
                testMode === 'custom' 
                  ? 'bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-rose-500/25 hover:shadow-rose-500/40' 
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/60 border border-gray-700/30 hover:border-gray-600/50 backdrop-blur-sm'
              )}
              onClick={() => setTestMode('custom')}
            >
              <Wrench className="h-4 w-4" />
              custom
            </button>
          </div>

          {/* Secondary Options Row */}
          <div className="flex items-center justify-between">
            {/* Duration/Count Options */}
            <div className="flex items-center gap-2">
              {testMode === 'time' && (
                <div className="flex items-center gap-2 bg-gray-800/30 backdrop-blur-sm border border-gray-700/30 rounded-xl p-1">
                  {[15, 30, 60, 120].map((duration) => (
                    <button 
                      key={duration}
                      className={clsx(
                        "px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 relative overflow-hidden",
                        testDuration === duration 
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25' 
                          : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-300'
                      )}
                      onClick={() => setTestDuration(duration)}
                    >
                      {duration}s
                      {testDuration === duration && (
                        <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {testMode === 'words' && (
                <div className="flex items-center gap-2 bg-gray-800/30 backdrop-blur-sm border border-gray-700/30 rounded-xl p-1">
                  {[25, 50, 100, 200].map((count) => (
                    <button 
                      key={count}
                      className={clsx(
                        "px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 relative overflow-hidden",
                        wordCount === count 
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25' 
                          : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-300'
                      )}
                      onClick={() => setWordCount(count)}
                    >
                      {count}
                      {wordCount === count && (
                        <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Language Selector */}
            <button className="group px-5 py-3 rounded-2xl text-sm font-semibold bg-gray-800/50 text-gray-300 hover:bg-gray-700/60 border border-gray-700/30 hover:border-gray-600/50 backdrop-blur-sm transition-all duration-300 flex items-center gap-2 shadow-lg hover:scale-105">
              <Globe className="h-4 w-4 group-hover:rotate-12 transition-transform duration-300" />
              english
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            </button>
          </div>
        </div>
      </div>

      {/* Live Stats Bar - Only show during active typing */}
      {time > 0 && !isTestComplete && (
        <div className="sticky top-[120px] z-40 bg-gray-900/90 backdrop-blur-xl border-y border-gray-800/50 shadow-xl animate-in slide-in-from-top duration-500">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-center gap-12">
              {/* WPM */}
              <div className="flex items-center gap-3 group">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-yellow-400/20 to-orange-500/20 rounded-xl border border-yellow-400/30">
                  <Zap className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-400 font-mono leading-none">
                    {wpm}
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">WPM</div>
                </div>
              </div>

              {/* Accuracy */}
              <div className="flex items-center gap-3 group">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-green-400/20 to-emerald-500/20 rounded-xl border border-green-400/30">
                  <Target className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-400 font-mono leading-none">
                    {accuracy}%
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Accuracy</div>
                </div>
              </div>

              {/* Time */}
              <div className="flex items-center gap-3 group">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-400/20 to-cyan-500/20 rounded-xl border border-blue-400/30">
                  <Timer className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-400 font-mono leading-none">
                    {time.toFixed(1)}s
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Time</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Typing Area */}
      <div className="flex-1 relative">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 via-transparent to-blue-400/5 pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-yellow-400/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>
        
        <TypingBox 
          onStatsUpdate={handleStatsUpdate}
          onTestComplete={handleTestComplete}
        />
      </div>

      {/* Bottom Helper Bar - Only show when not actively typing */}
      {time === 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-30 animate-in slide-in-from-bottom duration-700">
          <div className="bg-gray-800/80 backdrop-blur-xl border border-gray-700/50 rounded-2xl px-8 py-4 shadow-2xl">
            <div className="flex items-center gap-8 text-sm">
              <div className="flex items-center gap-3 text-gray-400">
                <div className="flex items-center gap-1">
                  <kbd className="px-3 py-1 bg-gray-700/60 border border-gray-600/50 rounded-lg text-xs font-mono text-gray-300">Tab</kbd>
                  <span className="text-gray-500">+</span>
                  <kbd className="px-3 py-1 bg-gray-700/60 border border-gray-600/50 rounded-lg text-xs font-mono text-gray-300">Enter</kbd>
                </div>
                <span className="font-medium">restart test</span>
              </div>
              
              <div className="w-px h-6 bg-gray-600/50"></div>
              
              <div className="flex items-center gap-3 text-gray-400">
                <kbd className="px-3 py-1 bg-gray-700/60 border border-gray-600/50 rounded-lg text-xs font-mono text-gray-300">Space</kbd>
                <span className="font-medium">next word</span>
              </div>
              
              <div className="w-px h-6 bg-gray-600/50"></div>
              
              <div className="flex items-center gap-3 text-gray-400">
                <kbd className="px-3 py-1 bg-gray-700/60 border border-gray-600/50 rounded-lg text-xs font-mono text-gray-300">Backspace</kbd>
                <span className="font-medium">go back</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Hint */}
      {!isTestComplete && time === 0 && (
        <div className="fixed top-1/2 right-8 transform -translate-y-1/2 z-20 animate-in slide-in-from-right duration-1000 delay-500">
          <div className="bg-gradient-to-br from-yellow-400/10 to-orange-500/10 backdrop-blur-sm border border-yellow-400/20 rounded-2xl p-4 max-w-xs">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-yellow-400/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <Zap className="w-4 h-4 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-200 mb-1">Ready to type?</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Focus on the text area and start typing to begin your test. Your speed and accuracy will be tracked in real-time.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TypingTest;