"use client"

import React, { useCallback, useEffect, useRef, useState } from 'react';
import TypingBox from './TypingBox';
import ResultsPanel from './ResultsPanel';
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
import { fetchJSON } from '@/lib/http';
import SmartTestBadge from '@/components/SmartTestBadge';

// --- NEW: simple local history for adaptive difficulty ---
const HISTORY_KEY = "ks_history_v1";
type Hist = { wpm: number; acc: number; ts: number };
function readHist(): Hist[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') as Hist[]; } catch { return []; }
}
function writeHist(items: Hist[]) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(-5))); } catch {}
}
function movingAvg(items: Hist[]) {
  if (!items.length) return { wpm: 0, acc: 100 };
  const n = items.length;
  const wpm = Math.round(items.reduce((s, x) => s + x.wpm, 0) / n);
  const acc = Math.round(items.reduce((s, x) => s + x.acc, 0) / n);
  return { wpm, acc };
}

type FetchResponse = {
  text: string;
  mode: 'words';
  count: number;
  seed: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  flags?: { punctuation: boolean; numbers: boolean };
};

const TypingTest: React.FC = () => {
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [time, setTime] = useState(0);
  const [isTestComplete, setIsTestComplete] = useState(false);
  const [view, setView] = useState<'typing' | 'results'>('typing');
  const [wpmSeries, setWpmSeries] = useState<Array<{ second: number; wpm: number }>>([]);
  const [analysisResult, setAnalysisResult] = useState<null | {
    input: string;
    corrections: string[];
    difficulty: string;
    feedback: string;
  }>(null);

  // Test configuration state
  const [testMode, setTestMode] = useState<'time' | 'words' | 'quote' | 'zen' | 'custom'>('words');
  // functional mode + duration (time mode)
  const [mode, setMode] = useState<'words' | 'time'>('words');
  const [durationSec, setDurationSec] = useState<number>(15);
  const [wordCount, setWordCount] = useState<number>(15);
  const [showPunctuation, setShowPunctuation] = useState(false);
  const [showNumbers, setShowNumbers] = useState(false);

  // Backend prompt state
  const [currentPrompt, setCurrentPrompt] = useState<string>("");
  const sessionUsedSeeds = useRef<Set<number>>(new Set());
  // Robust generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const lastPayloadRef = useRef<GeneratePayload | null>(null);
  const genAbortRef = useRef<AbortController | null>(null);
  const genSeqRef = useRef<number>(0);
  // backend base URL routed via fetchJSON
  // results-view combo restart listener (moved below to avoid forward reference)

  const usedDifficultyRef = useRef<"easy"|"medium"|"hard"|"auto">("auto");
  const [smartUsedDifficulty, setSmartUsedDifficulty] = useState<null | 'easy' | 'medium' | 'hard'>(null);
  const [smartFlags, setSmartFlags] = useState<null | { punctuation?: boolean; numbers?: boolean }>(null);
  const [avgWpm, setAvgWpm] = useState<number>(0);
  const [avgAcc, setAvgAcc] = useState<number>(100);
  const [prevDifficulty, setPrevDifficulty] = useState<null | 'easy'|'medium'|'hard'>(null);
  const [difficultyChanged, setDifficultyChanged] = useState(false);

  type GeneratePayload = {
    mode: 'words' | 'time';
    count?: number;
    duration?: number;
    include_punctuation?: boolean;
    include_numbers?: boolean;
    language?: string;
    difficulty?: 'easy'|'medium'|'hard'|'auto';
    recent_wpm?: number;
    recent_accuracy?: number;
  };

  const generatePrompt = useCallback(async (payload: GeneratePayload) => {
    // cancel previous in-flight
    if (genAbortRef.current) genAbortRef.current.abort();
    const controller = new AbortController();
    genAbortRef.current = controller;

    const seq = ++genSeqRef.current;
    lastPayloadRef.current = payload;
    setIsGenerating(true);
    setGenerateError(null);

    try {
      // Prefer Next.js proxy to avoid CORS/env drift
      const resp = await fetch("/api/generate-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal as unknown as AbortSignal,
      });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        console.error("[generator] HTTP error", resp.status, errText);
        throw new Error(`Generator HTTP ${resp.status}`);
      }

      const data = (await resp.json().catch(() => null)) as FetchResponse | null;

      // ignore stale
      if (seq !== genSeqRef.current) return;

      if (!data || !data.text) {
        console.error("[generator] empty response", data);
        throw new Error("Empty generator response");
      }

      sessionUsedSeeds.current.add(data.seed);
      setCurrentPrompt(data.text);
      if (data?.difficulty) { usedDifficultyRef.current = data.difficulty; }
      if (data?.difficulty) setSmartUsedDifficulty(data.difficulty);
      if (data?.flags) setSmartFlags(data.flags);
      setIsGenerating(false);
      console.log("[generator] success payload", data);
    } catch (err: unknown) {
      if (seq !== genSeqRef.current) return;
      setIsGenerating(false);
      const msg = err instanceof Error ? err.message : 'Failed to generate';
      setGenerateError(msg);
      console.error("[generator] failed", err);
    } finally {
      if (genAbortRef.current === controller) genAbortRef.current = null;
    }
  }, []);

  const busyRef = useRef(false);

  const handleRestart = useCallback(async (desiredCount?: number, flagOverrides?: { include_punctuation?: boolean; include_numbers?: boolean }) => {
    setView('typing');
    setWpmSeries([]);
    setIsTestComplete(false);
    const hist = readHist();
    const avg = movingAvg(hist);
    setAvgWpm(avg.wpm);
    setAvgAcc(avg.acc);
    if (mode === 'time') {
      const estWpm = avg.wpm > 0 ? avg.wpm : 50;
      const estWords = Math.ceil((estWpm * durationSec) / 60);
      const initialCount = Math.max(200, Math.ceil(estWords * 1.6));
      await generatePrompt({
        mode: 'time',
        count: initialCount,
        duration: durationSec,
        include_punctuation: flagOverrides?.include_punctuation ?? showPunctuation,
        include_numbers: flagOverrides?.include_numbers ?? showNumbers,
        language: 'english',
        difficulty: 'auto',
        recent_wpm: avg.wpm,
        recent_accuracy: avg.acc,
      });
    } else {
      const c = desiredCount ?? wordCount;
      await generatePrompt({
        mode: 'words',
        count: c,
        include_punctuation: flagOverrides?.include_punctuation ?? showPunctuation,
        include_numbers: flagOverrides?.include_numbers ?? showNumbers,
        language: 'english',
        difficulty: 'auto',
        recent_wpm: avg.wpm,
        recent_accuracy: avg.acc,
      });
    }
  }, [durationSec, generatePrompt, showNumbers, showPunctuation, wordCount, mode]);

  const safeRestart = useCallback(async (desiredCount?: number, flagOverrides?: { include_punctuation?: boolean; include_numbers?: boolean }) => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      await handleRestart(desiredCount, flagOverrides);
    } finally {
      busyRef.current = false;
    }
  }, [handleRestart]);

  // Fetch an initial prompt on mount with default wordCount (15)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Quick health ping via Next proxy for diagnostics
    fetch("/api/ping").then(async (r) => {
      const j = await r.json().catch(() => ({}));
      console.log("[ping]", j);
    });
    void safeRestart(15);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeRestart]);

  const handleStatsUpdate = (newWpm: number, newAccuracy: number, newTime: number) => {
    setWpm(newWpm);
    setAccuracy(newAccuracy);
    setTime(newTime);
    setIsTestComplete(false);
    const s = Math.max(1, Math.floor(newTime));
    setWpmSeries((prev) => (prev.length && prev[prev.length - 1].second === s) ? prev : [...prev, { second: s, wpm: newWpm }]);
  };

  // Ensure a 1s sampling cadence during active typing (view === 'typing' and not complete)
  useEffect(() => {
    const isActive = view === 'typing' && !isTestComplete;
    if (!isActive) return;
    const id = setInterval(() => {
      // Trigger a no-op update using existing values to keep the 1s cadence in the top bar
      setWpm((w) => w);
      setAccuracy((a) => a);
      setTime((t) => t);
    }, 1000);
    return () => clearInterval(id);
  }, [view, isTestComplete]);

  // Track difficulty changes to animate badge
  useEffect(() => {
    const current = smartUsedDifficulty;
    if (current && prevDifficulty && current !== prevDifficulty) {
      setDifficultyChanged(true);
      const t = setTimeout(() => setDifficultyChanged(false), 1500);
      return () => clearTimeout(t);
    }
    if (current) setPrevDifficulty(current);
  }, [smartUsedDifficulty, prevDifficulty]);

  const handleTestComplete = async (finalWpm: number, finalAccuracy: number, finalTime: number, finalTypedText?: string) => {
    setIsTestComplete(true);
    setWpm(finalWpm);
    setAccuracy(finalAccuracy);
    setTime(finalTime);
    setView('results');
    // update local history for adaptive difficulty
    try {
      const items = readHist();
      items.push({ wpm: finalWpm, acc: finalAccuracy, ts: Date.now() });
      writeHist(items);
    } catch {}
    if (!finalTypedText) return;
    try {
      const result = await fetchJSON<{ input: string; corrections: string[]; difficulty: string; feedback: string }>(
        "/analyze",
        { method: "POST", body: { user_text: finalTypedText } }
      );
      setAnalysisResult(result);
    } catch (err) {
      console.error("AI analysis error:", err);
      setAnalysisResult({
        input: finalTypedText,
        corrections: [],
        difficulty: "Unknown",
        feedback: "Could not fetch AI feedback. Please ensure backend is running.",
      });
    }
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
              onClick={async () => {
                const next = !showPunctuation;
                setShowPunctuation(next);
                await handleRestart(undefined, { include_punctuation: next });
              }}
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
              onClick={async () => {
                const next = !showNumbers;
                setShowNumbers(next);
                await handleRestart(undefined, { include_numbers: next });
              }}
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
              onClick={async () => { setTestMode('time'); setMode('time'); setView('typing'); await handleRestart(); }}
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
              onClick={async () => { setTestMode('words'); setMode('words'); setView('typing'); await handleRestart(); }}
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
                        durationSec === duration 
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25' 
                          : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-300'
                      )}
              onClick={async () => { setDurationSec(duration); setView('typing'); await safeRestart(); }}
                    >
                      {duration}s
                      {durationSec === duration && (
                        <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {testMode === 'words' && (
                <div className="flex items-center gap-2 bg-gray-800/30 backdrop-blur-sm border border-gray-700/30 rounded-xl p-1">
                  {[10, 15, 20, 30, 50].map((count) => (
                    <button 
                      key={count}
                      className={clsx(
                        "px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 relative overflow-hidden",
                        wordCount === count 
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25' 
                          : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-300'
                      )}
              onClick={async () => { setWordCount(count); await safeRestart(count); }}
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
      {time > 0 && view === 'typing' && (
        <div className="sticky top-[120px] z-40 bg-gray-900/90 backdrop-blur-xl border-y border-gray-800/50 shadow-xl animate-in slide-in-from-top duration-500">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-center gap-12 flex-wrap">
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
              {/* Smart Test badge */}
              {smartUsedDifficulty && (
                <SmartTestBadge usedDifficulty={smartUsedDifficulty} difficultyChanged={difficultyChanged} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Area */}
      <div className="flex-1 relative">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 via-transparent to-blue-400/5 pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-yellow-400/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>
        
        {view === 'typing' && (
          <>
            {/* Inline status / retry for generator */}
            {isGenerating ? (
              <div className="text-center text-sm opacity-80 my-4">Generating new text...</div>
            ) : generateError ? (
              <div className="text-center text-sm opacity-80 my-4">
                Couldn’t reach the generator.{" "}
                <button
                  className="underline decoration-dotted hover:opacity-100 opacity-80"
                  onClick={() => { if (lastPayloadRef.current) void generatePrompt(lastPayloadRef.current); }}
                >
                  Retry
                </button>
              </div>
            ) : null}

            <TypingBox 
              mode={mode}
              durationSec={durationSec}
              onStatsUpdate={handleStatsUpdate}
              onTestComplete={handleTestComplete}
              prompt={currentPrompt}
              onRequestNewPrompt={async () => { await safeRestart(); }}
              onRequestAppendPrompt={async () => {
                const extraCount = 120;
                const resp = await fetch('/api/generate-proxy', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    mode: 'words',
                    count: extraCount,
                    include_punctuation: showPunctuation,
                    include_numbers: showNumbers,
                    language: 'english',
                    difficulty: usedDifficultyRef.current || 'auto',
                  }),
                });
                if (!resp.ok) {
                  const errText = await resp.text().catch(() => '');
                  console.error('[generator] append HTTP error', resp.status, errText);
                  throw new Error('Generator append failed');
                }
                const data = (await resp.json().catch(() => null)) as FetchResponse | null;
                if (!data || !data.text) throw new Error('Empty generator response');
                return data.text;
              }}
            />
          </>
        )}
        {view === 'results' && (
          <div className="ks-section-gradient">
            <div className="ks-section-divider" />
            <ResultsPanel
              wpm={wpm}
              accuracy={accuracy}
              time={time}
              analysis={analysisResult}
              wpmSeries={wpmSeries}
              usedDifficulty={smartUsedDifficulty ?? undefined}
              avgWpm={avgWpm}
              avgAcc={avgAcc}
              flags={smartFlags ?? undefined}
              onNextTest={async () => { await safeRestart(); }}
            />
          </div>
        )}
      </div>

      {/* Results render via view switch above */}

      {/* Bottom Helper Bar - Always visible */}
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