"use client"

import React, { useState } from 'react';
import TypingBox from './TypingBox';
import StatsPanel from './StatsPanel';
import { 
  Clock, 
  Hash,
  AtSign,
  Quote,
  Triangle,
  Wrench,
  Globe
} from 'lucide-react';
import clsx from 'clsx';

const TypingTest: React.FC = () => {
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [time, setTime] = useState(0);
  const [isTestComplete, setIsTestComplete] = useState(false);
  const [finalStats, setFinalStats] = useState({
    wpm: 0,
    accuracy: 100,
    time: 0
  });

  // Test configuration state
  const [testMode, setTestMode] = useState<'time' | 'words'>('words');
  const [testDuration, setTestDuration] = useState(15);
  const [showPunctuation, setShowPunctuation] = useState(false);
  const [showNumbers, setShowNumbers] = useState(false);

  const handleStatsUpdate = (newWpm: number, newAccuracy: number, newTime: number) => {
    setWpm(newWpm);
    setAccuracy(newAccuracy);
    setTime(newTime);
    setIsTestComplete(false);
  };

  const handleTestComplete = (finalWpm: number, finalAccuracy: number, finalTime: number) => {
    setFinalStats({
      wpm: finalWpm,
      accuracy: finalAccuracy,
      time: finalTime
    });
    setIsTestComplete(true);
    
    // Reset after showing final stats
    setTimeout(() => {
      setIsTestComplete(false);
    }, 5000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Top Filter Bar */}
      <div className="bg-gray-800/20 backdrop-blur-sm border-b border-gray-700/30 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          {/* Main Options Row */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
            <button 
              className={clsx(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 flex items-center gap-2",
                showPunctuation 
                  ? 'bg-yellow-400 text-gray-900 shadow-lg shadow-yellow-400/25' 
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 border border-gray-600/30'
              )}
              onClick={() => setShowPunctuation(!showPunctuation)}
            >
              <AtSign className="h-4 w-4" />
              punctuation
            </button>
            
            <button 
              className={clsx(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 flex items-center gap-2",
                showNumbers 
                  ? 'bg-yellow-400 text-gray-900 shadow-lg shadow-yellow-400/25' 
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 border border-gray-600/30'
              )}
              onClick={() => setShowNumbers(!showNumbers)}
            >
              <Hash className="h-4 w-4" />
              numbers
            </button>
            
            <div className="w-px h-8 bg-gray-600/50 mx-2"></div>
            
            <button 
              className={clsx(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 flex items-center gap-2",
                testMode === 'time' 
                  ? 'bg-yellow-400 text-gray-900 shadow-lg shadow-yellow-400/25' 
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 border border-gray-600/30'
              )}
              onClick={() => setTestMode('time')}
            >
              <Clock className="h-4 w-4" />
              time
            </button>
            
            <button 
              className={clsx(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 flex items-center gap-2",
                testMode === 'words' 
                  ? 'bg-yellow-400 text-gray-900 shadow-lg shadow-yellow-400/25' 
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 border border-gray-600/30'
              )}
              onClick={() => setTestMode('words')}
            >
              <span className="text-lg">A</span>
              words
            </button>
            
            <button className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 border border-gray-600/30 transition-all duration-200 hover:scale-105 flex items-center gap-2">
              <Quote className="h-4 w-4" />
              quote
            </button>
            
            <button className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 border border-gray-600/30 transition-all duration-200 hover:scale-105 flex items-center gap-2">
              <Triangle className="h-4 w-4" />
              zen
            </button>
            
            <button className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 border border-gray-600/30 transition-all duration-200 hover:scale-105 flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              custom
            </button>
          </div>

          {/* Secondary Options Row */}
          <div className="flex items-center justify-between">
            {/* Duration Options (for time mode) */}
            {testMode === 'time' && (
              <div className="flex items-center gap-2">
                {[15, 30, 60, 120].map((duration) => (
                  <button 
                    key={duration}
                    className={clsx(
                      "px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200",
                      testDuration === duration 
                        ? 'bg-yellow-400 text-gray-900 shadow-md' 
                        : 'bg-gray-700/30 text-gray-400 hover:bg-gray-600/30 hover:text-gray-300'
                    )}
                    onClick={() => setTestDuration(duration)}
                  >
                    {duration}
                  </button>
                ))}
              </div>
            )}

            {/* Language Selector */}
            <button className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 border border-gray-600/30 transition-all duration-200 flex items-center gap-2">
              <Globe className="h-4 w-4" />
              english
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center px-6 py-8">
        {/* Typing Console */}
        <div className="w-full max-w-6xl">
          <TypingBox 
            onStatsUpdate={handleStatsUpdate}
            onTestComplete={handleTestComplete}
          />
        </div>

        {/* Stats Panel Below */}
        <div className="w-full max-w-4xl mt-8">
          <StatsPanel
            wpm={wpm}
            accuracy={accuracy}
            time={time}
            isTestComplete={isTestComplete}
            finalWpm={finalStats.wpm}
            finalAccuracy={finalStats.accuracy}
            finalTime={finalStats.time}
          />
        </div>
      </div>

      {/* Keyboard Hints */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2">
        <div className="bg-gray-800/70 backdrop-blur-sm border border-gray-700/50 rounded-xl px-6 py-3">
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-gray-700/50 border border-gray-600/50 rounded text-xs">Tab</kbd>
              <span>restart test</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-gray-700/50 border border-gray-600/50 rounded text-xs">Space</kbd>
              <span>next word</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TypingTest;