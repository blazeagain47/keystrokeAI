"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Zap, Target, Timer, Activity, Keyboard, AlertTriangle } from "lucide-react";  // icons for each stat
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';  // chart library

interface StatsPanelProps {
  wpm: number;
  accuracy: number;
  time: number;
  /** When true, the test has finished and final values should be displayed */
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
  // Decide which values to display (live or final)
  const displayWpm = isTestComplete ? finalWpm ?? wpm : wpm;
  const displayAccuracy = isTestComplete ? finalAccuracy ?? accuracy : accuracy;
  const displayTime = isTestComplete ? finalTime ?? time : time;

  // State for loading animation and reveal timing
  const [showResults, setShowResults] = useState(false);

  // When test completes, trigger a short delay before revealing results
  useEffect(() => {
    if (isTestComplete) {
      setShowResults(false);  // start in loading state
      const timer = setTimeout(() => {
        setShowResults(true);
      }, 800);  // ~0.8s delay for shimmer
      return () => clearTimeout(timer);
    } else {
      // If starting a new test, reset immediately
      setShowResults(true);
    }
  }, [isTestComplete]);

  // Prepare data for the speed trend chart (WPM over time).
  // In a real scenario, we'd collect WPM data points during the test. Here we simulate a trend:
  const speedData: Array<{ timeSec: number; wpm: number }> = [];
  if (isTestComplete) {
    const totalSec = Math.round(displayTime);
    for (let t = 0; t <= totalSec; t += Math.max(1, Math.floor(totalSec / 10))) {
      // Simulate WPM progression: start lower, end at finalWpm, with slight fluctuations
      const fraction = t / (displayTime || 1);
      let simulatedWpm = Math.round((displayWpm || 0) * (0.5 + fraction * 0.5)); 
      // add a small random jitter
      if (simulatedWpm > 0) {
        simulatedWpm += Math.floor(Math.random() * 5 - 2); 
      }
      simulatedWpm = Math.max(0, Math.min(simulatedWpm, displayWpm || 0));
      speedData.push({ timeSec: t, wpm: simulatedWpm });
    }
    // Ensure final point is the exact final WPM
    speedData.push({ timeSec: Math.round(displayTime), wpm: displayWpm || 0 });
  }

  // Utility to clamp a percentage between 0-100
  const clampPercent = (val: number) => Math.min(Math.round(val), 100);

  // Derive total characters and errors for final stats (to display in cards)
  const totalChars = Math.round(
    // if accuracy is 100 (or val is 0), avoid division by zero
    displayAccuracy > 0 ? (displayWpm * (displayTime / 60) * 5) / (displayAccuracy / 100) : displayWpm * (displayTime / 60) * 5
  );
  const errorCount = Math.max(0,
    Math.round(totalChars - (displayWpm * (displayTime / 60) * 5))
  );

  // Performance badge text and style based on results
  let performanceText = "Great job!";
  let performanceIcon = <Zap className="h-5 w-5" />;
  let performanceClasses = "bg-green-900/30 text-green-300 border-green-700/50 shadow-green-500/15";
  if (displayWpm && displayAccuracy) {
    const wpmVal = displayWpm;
    const accVal = displayAccuracy;
    if (wpmVal >= 80 && accVal >= 95) {
      performanceText = "Excellent performance!";
      performanceIcon = <Zap className="h-5 w-5" />;  // lightning for excellent speed
      performanceClasses = "bg-green-900/30 text-green-300 border-green-700/50 shadow-green-500/15";
    } else if (wpmVal >= 50 && accVal >= 90) {
      performanceText = "Great job!";
      performanceIcon = <Zap className="h-5 w-5" />;
      performanceClasses = "bg-blue-900/30 text-blue-300 border-blue-700/50 shadow-blue-500/15";
    } else if (wpmVal >= 30 && accVal >= 80) {
      performanceText = "Good effort – keep practicing!";
      performanceIcon = <Activity className="h-5 w-5" />;
      performanceClasses = "bg-yellow-800/30 text-yellow-300 border-yellow-700/50 shadow-yellow-500/15";
    } else {
      performanceText = "Needs work – practice makes perfect!";
      performanceIcon = <AlertTriangle className="h-5 w-5" />;
      performanceClasses = "bg-red-900/30 text-red-300 border-red-700/50 shadow-red-500/15";
    }
  }

  return (
    <div className="w-full mt-4"> 
      {/* Tabs for Overview and Trend */}
      <Tabs defaultValue="overview">
        <TabsList className="mb-4 mx-auto bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50">
          <TabsTrigger value="overview" className="px-4 py-2 text-sm font-medium text-gray-300 data-[state=active]:text-white data-[state=active]:bg-gray-700/50 rounded-lg">
            Overview
          </TabsTrigger>
          <TabsTrigger value="trend" className="px-4 py-2 text-sm font-medium text-gray-300 data-[state=active]:text-white data-[state=active]:bg-gray-700/50 rounded-lg">
            Speed Trend
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab Content */}
        <TabsContent value="overview">
          {/* If results are not yet ready (immediately after test), show placeholders */}
          {!showResults ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 animate-pulse">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={`placeholder-${i}`} className="h-28 bg-gray-700/20 rounded-xl" />
              ))}
            </div>
          ) : (
            <div 
              className="grid grid-cols-2 md:grid-cols-3 gap-4"
              // Add a special class to enable staggered animations via CSS
              style={{ overflow: 'hidden' }}
            >
              {/* WPM Card */}
              <Card className="relative overflow-hidden border border-yellow-400/30 bg-gray-800/60 backdrop-blur-sm rounded-xl shadow-md group">
                {/* Hover gradient glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <CardHeader className="flex flex-row items-center gap-3 pb-1">
                  <div className="flex items-center justify-center w-10 h-10 bg-yellow-500/20 rounded-lg">
                    <Zap className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div>
                    <CardTitle className="text-sm text-yellow-100">Words Per Minute</CardTitle>
                    <CardDescription className="text-gray-400">Your typing speed</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold font-mono text-yellow-400 mb-1">
                    {displayWpm}
                  </p>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill from-yellow-400 to-orange-400"
                      style={{ width: `${clampPercent((displayWpm / 100) * 100)}%` }}
                    />
                  </div>
                  {/* We omit the percent label here for cleaner look */}
                </CardContent>
              </Card>

              {/* Accuracy Card */}
              <Card className="relative overflow-hidden border border-green-400/30 bg-gray-800/60 backdrop-blur-sm rounded-xl shadow-md group">
                <div className="absolute inset-0 bg-gradient-to-br from-green-400/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <CardHeader className="flex flex-row items-center gap-3 pb-1">
                  <div className="flex items-center justify-center w-10 h-10 bg-green-500/20 rounded-lg">
                    <Target className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <CardTitle className="text-sm text-green-100">Accuracy</CardTitle>
                    <CardDescription className="text-gray-400">Character precision</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold font-mono text-green-400 mb-1">
                    {displayAccuracy}%
                  </p>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill from-green-400 to-emerald-400"
                      style={{ width: `${clampPercent(displayAccuracy)}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Time Elapsed Card */}
              <Card className="relative overflow-hidden border border-blue-400/30 bg-gray-800/60 backdrop-blur-sm rounded-xl shadow-md group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <CardHeader className="flex flex-row items-center gap-3 pb-1">
                  <div className="flex items-center justify-center w-10 h-10 bg-blue-500/20 rounded-lg">
                    <Timer className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-sm text-blue-100">Time Elapsed</CardTitle>
                    <CardDescription className="text-gray-400">Test duration</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold font-mono text-blue-400 mb-1">
                    {displayTime.toFixed(1)}s
                  </p>
                  {/* For time, we won't show a progress bar, but could show progress vs 60s if desired */}
                  <div className="progress-bar">
                    <div 
                      className="progress-fill from-blue-400 to-cyan-400" 
                      style={{ width: `${clampPercent((displayTime / 60) * 100)}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Characters per Minute Card */}
              <Card className="relative overflow-hidden border border-purple-400/30 bg-gray-800/60 backdrop-blur-sm rounded-xl shadow-md group">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400/10 to-fuchsia-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <CardHeader className="flex flex-row items-center gap-3 pb-1">
                  <div className="flex items-center justify-center w-10 h-10 bg-purple-500/20 rounded-lg">
                    <Activity className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <CardTitle className="text-sm text-purple-100">Characters/min</CardTitle>
                    <CardDescription className="text-gray-400">Typing pace</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold font-mono text-purple-400 mb-1">
                    {Math.round(displayWpm * 5)}
                  </p>
                  {/* No progress bar for CPM (it correlates with WPM) */}
                </CardContent>
              </Card>

              {/* Total Characters Card */}
              <Card className="relative overflow-hidden border border-teal-400/30 bg-gray-800/60 backdrop-blur-sm rounded-xl shadow-md group">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-400/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <CardHeader className="flex flex-row items-center gap-3 pb-1">
                  <div className="flex items-center justify-center w-10 h-10 bg-teal-500/20 rounded-lg">
                    <Keyboard className="h-5 w-5 text-teal-400" />
                  </div>
                  <div>
                    <CardTitle className="text-sm text-teal-100">Total Characters</CardTitle>
                    <CardDescription className="text-gray-400">Keystrokes typed</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold font-mono text-teal-400 mb-1">
                    {totalChars}
                  </p>
                </CardContent>
              </Card>

              {/* Errors Card */}
              <Card className="relative overflow-hidden border border-red-400/30 bg-gray-800/60 backdrop-blur-sm rounded-xl shadow-md group">
                <div className="absolute inset-0 bg-gradient-to-br from-red-400/10 to-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <CardHeader className="flex flex-row items-center gap-3 pb-1">
                  <div className="flex items-center justify-center w-10 h-10 bg-red-500/20 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                  </div>
                  <div>
                    <CardTitle className="text-sm text-red-100">Errors</CardTitle>
                    <CardDescription className="text-gray-400">Mistakes made</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold font-mono text-red-400 mb-1">
                    {errorCount}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
          {/* Performance summary badge */}
          {showResults && isTestComplete && (
            <div className="flex justify-center mt-6">
              <span 
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-base font-semibold border backdrop-blur-sm shadow-xl transition ${performanceClasses}`}
              >
                {performanceIcon}
                {performanceText}
              </span>
            </div>
          )}
        </TabsContent>

        {/* Speed Trend Tab Content */}
        <TabsContent value="trend">
          { !isTestComplete ? (
            <p className="text-sm text-gray-400">Complete a test to see the speed chart.</p>
          ) : (
            <Card className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 p-4">
              <CardHeader>
                <CardTitle className="text-sm text-gray-100">Speed Over Time</CardTitle>
                <CardDescription className="text-gray-400">WPM vs Time (seconds)</CardDescription>
              </CardHeader>
              <CardContent className="mt-2">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={speedData}>
                    <XAxis dataKey="timeSec" stroke="#718096" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#718096" tick={{ fontSize: 10 }} domain={[0, Math.max(displayWpm || 0, 10)]} />
                    <Tooltip contentStyle={{ backgroundColor: "#1a202c", border: "none", borderRadius: "0.5rem" }} />
                    <Line type="monotone" dataKey="wpm" stroke="#67e8f9" strokeWidth={2} dot={{ r: 1 }} activeDot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StatsPanel;
