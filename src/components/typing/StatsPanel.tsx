"use client"

import React from 'react';
import { Clock, Target, Zap, TrendingUp, BarChart3, Timer } from 'lucide-react';

interface StatsPanelProps {
  wpm: number;
  accuracy: number;
  time: number;
  isTestComplete?: boolean;
  finalWpm?: number;
  finalAccuracy?: number;
  finalTime?: number;
}

const StatsPanel: React.FC<StatsPanelProps> = ({
  wpm,
  accuracy,
  time,
  isTestComplete = false,
  finalWpm,
  finalAccuracy,
  finalTime
}) => {
  const displayWpm = isTestComplete ? finalWpm : wpm;
  const displayAccuracy = isTestComplete ? finalAccuracy : accuracy;
  const displayTime = isTestComplete ? finalTime : time;

  return (
    <div className="w-full">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* WPM Card */}
        <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 hover:bg-gray-800/40 transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-400/20 rounded-xl flex items-center justify-center">
                <Zap className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-300">Words Per Minute</h3>
                <p className="text-xs text-gray-500">Your typing speed</p>
              </div>
            </div>
          </div>
          <div className="text-4xl font-bold text-white mb-2">
            {displayWpm || 0}
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1 bg-gray-700 rounded-full flex-1">
              <div 
                className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((displayWpm || 0) / 100 * 100, 100)}%` }}
              />
            </div>
            <span className="text-xs text-gray-400">{Math.min((displayWpm || 0) / 100 * 100, 100).toFixed(0)}%</span>
          </div>
        </div>

        {/* Accuracy Card */}
        <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 hover:bg-gray-800/40 transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-400/20 rounded-xl flex items-center justify-center">
                <Target className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-300">Accuracy</h3>
                <p className="text-xs text-gray-500">Character precision</p>
              </div>
            </div>
          </div>
          <div className="text-4xl font-bold text-white mb-2">
            {displayAccuracy || 100}%
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1 bg-gray-700 rounded-full flex-1">
              <div 
                className="h-full bg-gradient-to-r from-green-400 to-emerald-400 rounded-full transition-all duration-300"
                style={{ width: `${displayAccuracy || 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-400">{displayAccuracy || 100}%</span>
          </div>
        </div>

        {/* Time Card */}
        <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 hover:bg-gray-800/40 transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-400/20 rounded-xl flex items-center justify-center">
                <Timer className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-300">Time Elapsed</h3>
                <p className="text-xs text-gray-500">Test duration</p>
              </div>
            </div>
          </div>
          <div className="text-4xl font-bold text-white mb-2">
            {displayTime ? displayTime.toFixed(1) : '0.0'}s
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1 bg-gray-700 rounded-full flex-1">
              <div 
                className="h-full bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((displayTime || 0) / 60 * 100, 100)}%` }}
              />
            </div>
            <span className="text-xs text-gray-400">{Math.min((displayTime || 0) / 60 * 100, 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800/20 backdrop-blur-sm border border-gray-700/30 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">
            {Math.round((displayWpm || 0) * 5)}
          </div>
          <div className="text-xs text-gray-400 mt-1">Characters/min</div>
        </div>
        
        <div className="bg-gray-800/20 backdrop-blur-sm border border-gray-700/30 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">
            {Math.round(100 - (displayAccuracy || 100))}
          </div>
          <div className="text-xs text-gray-400 mt-1">Errors</div>
        </div>

        <div className="bg-gray-800/20 backdrop-blur-sm border border-gray-700/30 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">
            {displayTime ? Math.round((displayWpm || 0) * (displayTime / 60)) : 0}
          </div>
          <div className="text-xs text-gray-400 mt-1">Total chars</div>
        </div>

        <div className="bg-gray-800/20 backdrop-blur-sm border border-gray-700/30 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">
            {displayTime ? Math.round(displayTime / 60 * 100) / 100 : 0}
          </div>
          <div className="text-xs text-gray-400 mt-1">Minutes</div>
        </div>
      </div>

      {/* Live Status Indicator */}
      <div className="flex items-center justify-center">
        <div className={`flex items-center gap-3 px-4 py-2 rounded-full transition-all duration-200 ${
          isTestComplete 
            ? 'bg-green-900/30 border border-green-800/50' 
            : displayTime > 0 
              ? 'bg-yellow-900/30 border border-yellow-800/50' 
              : 'bg-gray-800/30 border border-gray-700/50'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            isTestComplete 
              ? 'bg-green-400 animate-pulse' 
              : displayTime > 0 
                ? 'bg-yellow-400 animate-pulse' 
                : 'bg-gray-500'
          }`} />
          <span className={`text-sm font-medium ${
            isTestComplete 
              ? 'text-green-400' 
              : displayTime > 0 
                ? 'text-yellow-400' 
                : 'text-gray-400'
          }`}>
            {isTestComplete 
              ? 'Test Complete!' 
              : displayTime > 0 
                ? 'Typing in progress...' 
                : 'Ready to start typing'
            }
          </span>
        </div>
      </div>

      {/* Performance Insights */}
      {isTestComplete && (
        <div className="mt-6 bg-gray-800/20 backdrop-blur-sm border border-gray-700/30 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="h-5 w-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Performance Summary</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className={`text-lg font-bold ${
                (finalWpm || 0) >= 40 ? 'text-green-400' : 
                (finalWpm || 0) >= 25 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {(finalWpm || 0) >= 40 ? 'Excellent' : 
                 (finalWpm || 0) >= 25 ? 'Good' : 'Needs Practice'}
              </div>
              <div className="text-xs text-gray-400">Speed Rating</div>
            </div>
            
            <div className="text-center">
              <div className={`text-lg font-bold ${
                (finalAccuracy || 0) >= 95 ? 'text-green-400' : 
                (finalAccuracy || 0) >= 85 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {(finalAccuracy || 0) >= 95 ? 'Perfect' : 
                 (finalAccuracy || 0) >= 85 ? 'Great' : 'Focus More'}
              </div>
              <div className="text-xs text-gray-400">Accuracy Rating</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-bold text-blue-400">
                Level {Math.floor((finalWpm || 0) / 10) + 1}
              </div>
              <div className="text-xs text-gray-400">Skill Level</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsPanel;