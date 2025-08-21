"use client"

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useStatsStore } from '@/stores/useStatsStore';
import { useSettingsStore } from '@/store/settings';
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
import { fetchWithRetry } from '@/lib/fetchWithRetry';
import { generateLocalPrompt } from '@/lib/localPrompt';
import { toLowerLettersOnly, ensureExactWordCount } from '@/lib/prompt/normalize';
import { normalizePromptWords } from '@/lib/text';
import SmartTestBadge from '@/components/SmartTestBadge';
import ReadyToast from '@/components/typing/ReadyToast';

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
  type PromptLoad = 'idle'|'loading'|'ready'|'error';
  const [promptLoad, setPromptLoad] = useState<PromptLoad>('idle');
  const [promptError, setPromptError] = useState<string | null>(null);
  const bootLockRef = useRef(false);
  const bootAbortRef = useRef<AbortController | null>(null);
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

  // Keep the exact config actually used to generate the test
  const lastUsedConfigRef = useRef<{
    mode: 'words'|'time',
    wordCount?: number | null,
    durationSec?: number | null,
    language?: string,
    include_punctuation?: boolean,
    include_numbers?: boolean,
  }>({
    mode: 'words',
    wordCount: 15,
    durationSec: null,
    language: 'english',
    include_punctuation: false,
    include_numbers: false,
  });

  // Backend prompt state
  const [currentPrompt, setCurrentPrompt] = useState<string>("");
  const sessionUsedSeeds = useRef<Set<number>>(new Set());
  // backend base URL routed via fetchJSON
  // results-view combo restart listener (moved below to avoid forward reference)

  const usedDifficultyRef = useRef<"easy"|"medium"|"hard"|"auto">("auto");
  const [smartUsedDifficulty, setSmartUsedDifficulty] = useState<null | 'easy' | 'medium' | 'hard'>(null);
  const [smartFlags, setSmartFlags] = useState<null | { punctuation?: boolean; numbers?: boolean }>(null);
  const [avgWpm, setAvgWpm] = useState<number>(0);
  const [avgAcc, setAvgAcc] = useState<number>(100);
  const [prevDifficulty, setPrevDifficulty] = useState<null | 'easy'|'medium'|'hard'>(null);
  const [difficultyChanged, setDifficultyChanged] = useState(false);

  // Reflect zen mode to the document for global backdrop behavior
  useEffect(() => {
    try {
      document.documentElement.dataset.zen = testMode === 'zen' ? '1' : '0';
      // notify any listeners that zen mode changed
      window.dispatchEvent(new Event('bk:zenChanged'));
    } catch {}
  }, [testMode]);

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

  async function loadPromptOnce(opts?: { useFallback?: boolean; overrides?: Partial<GeneratePayload> }) {
    if (bootLockRef.current) return;
    bootLockRef.current = true;
    setPromptError(null);
    setPromptLoad('loading');

    try { bootAbortRef.current?.abort(); } catch {}
    bootAbortRef.current = new AbortController();

    try {
      let promptText: string | null = null;

      if (!opts?.useFallback) {
        const hist = readHist();
        const avg = movingAvg(hist);
        const useTime = mode === 'time';
        // Prefer override when present to avoid setState race
        const effectiveCount = useTime ? undefined : (opts?.overrides?.count ?? wordCount);
        if (useTime) {
          const estWpm = avg.wpm > 0 ? avg.wpm : 50;
          const estWords = Math.ceil((estWpm * durationSec) / 60);
          // For time mode we send a generous token count; words count is ignored
          // (kept as undefined to rely on duration)
        }

        const payload: GeneratePayload = {
          mode: useTime ? 'time' : 'words',
          count: effectiveCount,
          duration: useTime ? durationSec : undefined,
          include_punctuation: showPunctuation,
          include_numbers: showNumbers,
          language: 'english',
          difficulty: 'auto',
          recent_wpm: avg.wpm,
          recent_accuracy: avg.acc,
        };

        const data = await fetchWithRetry('/api/generate-proxy', {
          attempts: 3,
          timeoutMs: 10000,
          backoffMs: 700,
          factor: 1.7,
          fetchInit: {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...payload, ...(opts?.overrides || {}) }),
            signal: bootAbortRef.current?.signal as unknown as AbortSignal,
          },
        });
        promptText = data?.text ?? data?.prompt ?? data?.data?.prompt ?? null;
        if (data?.seed != null) try { sessionUsedSeeds.current.add(Number(data.seed)); } catch {}
        if (data?.difficulty) { usedDifficultyRef.current = data.difficulty; setSmartUsedDifficulty(data.difficulty); }
        if (data?.flags) setSmartFlags(data.flags);
      }

      if (!promptText) {
        const useTime = mode === 'time';
        const effectiveCount = useTime ? undefined : (opts?.overrides?.count ?? wordCount ?? 15);
        const wc = useTime ? 200 : Number(effectiveCount ?? 15);
        promptText = generateLocalPrompt({ wordCount: wc });
      }

      // Enforce exact words count using a single effective count and lowercase globally
      let finalPrompt = String(promptText);
      {
        const useTime = mode === 'time';
        const effectiveCount = useTime ? undefined : (opts?.overrides?.count ?? wordCount ?? 15);

        // Record the effective config we just used
        lastUsedConfigRef.current = {
          mode: useTime ? 'time' : 'words',
          wordCount: useTime ? null : (typeof effectiveCount === 'number' ? effectiveCount : null),
          durationSec: useTime ? durationSec : null,
          language: 'english',
          include_punctuation: showPunctuation,
          include_numbers: showNumbers,
        };

        if (!useTime) {
          const n = Number(effectiveCount ?? 15);
          if (Number.isFinite(n) && n > 0) {
            finalPrompt = ensureExactWordCount(finalPrompt, n);
          }
        }
      }
      finalPrompt = toLowerLettersOnly(finalPrompt, 'en-US');
      finalPrompt = normalizePromptWords(finalPrompt);

      setIsTestComplete(false);
      setTime(0);
      setView('typing');
      setCurrentPrompt(finalPrompt);
      setPromptLoad('ready');
    } catch (err: any) {
      console.error('[prompt boot] error', err);
      setPromptError(err?.message ?? 'Failed to load prompt');
      setPromptLoad('error');
      bootLockRef.current = false;
      return;
    }
  }

  const busyRef = useRef(false);

  const handleRestart = useCallback(async (desiredCount?: number, flagOverrides?: { include_punctuation?: boolean; include_numbers?: boolean }) => {
    setIsTestComplete(false);
    setTime(0);
    setView('typing');
    setWpmSeries([]);
    const hist = readHist();
    const avg = movingAvg(hist);
    setAvgWpm(avg.wpm);
    setAvgAcc(avg.acc);
    bootLockRef.current = false;
    const overrides: Partial<GeneratePayload> = {
      count: desiredCount,
      include_punctuation: flagOverrides?.include_punctuation,
      include_numbers: flagOverrides?.include_numbers,
    };
    await loadPromptOnce({ overrides });
  }, []);

  const safeRestart = useCallback(async (desiredCount?: number, flagOverrides?: { include_punctuation?: boolean; include_numbers?: boolean }) => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      await handleRestart(desiredCount, flagOverrides);
    } finally {
      busyRef.current = false;
    }
  }, [handleRestart]);

  // Initial boot – run once after mount, no duplicate triggers
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (promptLoad !== 'idle') return;
    loadPromptOnce().catch(() => {});
    return () => {
      try { bootAbortRef.current?.abort(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Honor deep link: /#new → start fresh test and clear hash
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash === '#new') {
      setTimeout(() => {
        try { void safeRestart(); } catch {}
        try { history.replaceState(null, '', '/'); } catch {}
      }, 0);
    }
  }, [safeRestart]);

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

    // Guarantee a normalized history append for both modes (words/time)
    try {
      const used = lastUsedConfigRef.current;
      useStatsStore.getState().append({
        id: (globalThis as any).crypto?.randomUUID ? (globalThis as any).crypto.randomUUID() : String(Date.now()),
        ts: Date.now(),
        wpm: finalWpm,
        acc: finalAccuracy,
        durationSec: Math.round(finalTime ?? 0),
        mode: used.mode,
        words: used.mode === 'words' ? (used.wordCount ?? undefined) : undefined,
        // the store append() normalizes accuracyPct/completion flags
      } as any);
    } catch {}
    if (!finalTypedText) return;
    try {
      const result = await fetchJSON<{ input: string; corrections: string[]; difficulty: string; feedback: string }>(
        "/analyze",
        { method: "POST", body: JSON.stringify({ user_text: finalTypedText }) }
      );
      setAnalysisResult(result);
    } catch (err) {
      console.warn("Non-fatal: run analyze failed (offline or backend down)", err);
      setAnalysisResult({
        input: finalTypedText,
        corrections: [],
        difficulty: "Unknown",
        feedback: "Could not fetch AI feedback. Please ensure backend is running.",
      });
    }
    // Fire-and-forget: persist run to server (guest-safe)
    try {
      const payload = {
        mode: view === 'typing' ? (mode === 'time' ? `time/${durationSec}` : `words/${wordCount}`) : 'words',
        durationSec: Math.round(finalTime),
        wordsCount: mode === 'words' ? wordCount : undefined,
        wpm: Math.round(finalWpm),
        accuracy: Math.round(finalAccuracy),
      };
      const guestId = (() => {
        try { return localStorage.getItem('bk_guest_id') || (() => { const id = crypto.randomUUID(); localStorage.setItem('bk_guest_id', id); return id; })(); } catch { return null; }
      })();
      await fetch('/api/runs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, guestId }) });
    } catch {}
  };

  const filterRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const statsRef  = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const headerEl =
      (document.querySelector('[data-app-header]') as HTMLElement) ||
      (document.querySelector('header') as HTMLElement) ||
      null;

    const setVars = () => {
      const headerH = headerEl ? headerEl.getBoundingClientRect().height : 64;
      const filterH = filterRef.current
        ? filterRef.current.getBoundingClientRect().height
        : 0;
      const statsH  = statsRef.current
        ? statsRef.current.getBoundingClientRect().height
        : 0;
      el.style.setProperty("--bk-header-h", `${Math.round(headerH)}px`);
      el.style.setProperty("--bk-filter-h", `${Math.round(filterH)}px`);
      el.style.setProperty("--bk-stats-h", `${Math.round(statsH)}px`);
    };

    setVars();
    window.addEventListener("resize", setVars);
    const ro = new ResizeObserver(setVars);
    headerEl && ro.observe(headerEl);
    filterRef.current && ro.observe(filterRef.current);
    statsRef.current && ro.observe(statsRef.current);

    return () => {
      window.removeEventListener("resize", setVars);
      ro.disconnect();
    };
  }, [view]);

  // Measure combined height of filter + stats and set CSS transform offset on root
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const applyOffset = () => {
      const filterH = filterRef.current?.offsetHeight ?? 0;
      const statsH  = statsRef.current?.offsetHeight ?? 0;
      const total = filterH + statsH;
      try { root.style.setProperty('--typing-offset', `${total}px`); } catch {}
    };

    applyOffset();
    const ro = new ResizeObserver(applyOffset);
    if (filterRef.current) ro.observe(filterRef.current);
    if (statsRef.current)  ro.observe(statsRef.current);
    window.addEventListener('resize', applyOffset);
    return () => {
      try { ro.disconnect(); } catch {}
      window.removeEventListener('resize', applyOffset);
    };
  }, [rootRef, filterRef, statsRef]);

  const isRunning = view === 'typing' && !isTestComplete && time > 0;

  return (
    <div ref={rootRef} className="min-h-dvh" data-view={view} data-run={isRunning ? 'true' : 'false'}>
      {/* Top Navigation/Filter Bar */}
      {view !== 'results' && (
      <div ref={filterRef} className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800/50 shadow-2xl bk-filter-bar hide-on-test" aria-hidden={view === 'typing' && !isTestComplete && time > 0}>
        <div className="max-w-7xl mx-auto px-6 py-6">
          
          {/* Main Mode Selection */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            {/* Special Features */}
            <button 
              className={clsx(
                "group relative px-5 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 hover:scale-105 flex items-center gap-2 shadow-lg",
                "bk-chip bk-focus",
                showPunctuation 
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 shadow-yellow-400/25 hover:shadow-yellow-400/40 bk-chip--active' 
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/60 border border-gray-700/30 hover:border-gray-600/50 backdrop-blur-sm'
              )}
              aria-pressed={showPunctuation}
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
                "bk-chip bk-focus",
                showNumbers 
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 shadow-yellow-400/25 hover:shadow-yellow-400/40 bk-chip--active' 
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/60 border border-gray-700/30 hover:border-gray-600/50 backdrop-blur-sm'
              )}
              aria-pressed={showNumbers}
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
            <div className="bk-segment bk-filter-row">
              <button 
                className={clsx(
                  "group relative px-5 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 hover:scale-105 flex items-center gap-2 shadow-lg",
                  "bk-segment__item bk-focus",
                  testMode === 'time' 
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-blue-500/25 hover:shadow-blue-500/40' 
                    : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/60 border border-gray-700/30 hover:border-gray-600/50 backdrop-blur-sm'
                )}
                aria-pressed={testMode === 'time'}
                onClick={async () => { setTestMode('time'); setMode('time'); setView('typing'); await handleRestart(); }}
              >
                <Clock className="h-4 w-4" />
                time
              </button>
              
              <button 
                className={clsx(
                  "group relative px-5 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 hover:scale-105 flex items-center gap-2 shadow-lg",
                  "bk-segment__item bk-focus",
                  testMode === 'words' 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-purple-500/25 hover:shadow-purple-500/40' 
                    : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/60 border border-gray-700/30 hover:border-gray-600/50 backdrop-blur-sm'
                )}
                aria-pressed={testMode === 'words'}
                onClick={async () => { setTestMode('words'); setMode('words'); setView('typing'); await handleRestart(); }}
              >
                <span className="text-lg font-bold">A</span>
                words
              </button>
              
              <button 
                className={clsx(
                  "group relative px-5 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 hover:scale-105 flex items-center gap-2 shadow-lg",
                  "bk-segment__item bk-focus",
                  testMode === 'quote' 
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/25 hover:shadow-emerald-500/40' 
                    : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/60 border border-gray-700/30 hover:border-gray-600/50 backdrop-blur-sm'
                )}
                aria-pressed={testMode === 'quote'}
                onClick={() => setTestMode('quote')}
              >
                <Quote className="h-4 w-4" />
                quote
              </button>
              
              <button 
                className={clsx(
                  "group relative px-5 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 hover:scale-105 flex items-center gap-2 shadow-lg",
                  "bk-segment__item bk-focus",
                  testMode === 'zen' 
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-indigo-500/25 hover:shadow-indigo-500/40' 
                    : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/60 border border-gray-700/30 hover:border-gray-600/50 backdrop-blur-sm'
                )}
                aria-pressed={testMode === 'zen'}
                onClick={() => setTestMode('zen')}
              >
                <Triangle className="h-4 w-4" />
                zen
              </button>
              
              <button 
                className={clsx(
                  "group relative px-5 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 hover:scale-105 flex items-center gap-2 shadow-lg",
                  "bk-segment__item bk-focus",
                  testMode === 'custom' 
                    ? 'bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-rose-500/25 hover:shadow-rose-500/40' 
                    : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/60 border border-gray-700/30 hover:border-gray-600/50 backdrop-blur-sm'
                )}
                aria-pressed={testMode === 'custom'}
                onClick={() => setTestMode('custom')}
              >
                <Wrench className="h-4 w-4" />
                custom
              </button>
            </div>
          </div>

          {/* Secondary Options Row */}
          <div className="flex items-center justify-between">
            {/* Duration/Count Options */}
            <div className="flex items-center gap-2 bk-filter-row">
              {testMode === 'time' && (
                <div className="flex items-center gap-2 bg-gray-800/30 backdrop-blur-sm border border-gray-700/30 rounded-xl p-1 bk-segment">
                  {[15, 30, 60, 120].map((duration) => (
                    <button 
                      key={duration}
                      className={clsx(
                        "px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 relative overflow-hidden",
                        "bk-segment__item bk-focus",
                        durationSec === duration 
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25' 
                          : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-300'
                      )}
                      aria-pressed={durationSec === duration}
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
                <div className="flex items-center gap-2 bg-gray-800/30 backdrop-blur-sm border border-gray-700/30 rounded-xl p-1 bk-segment">
                  {[10, 15, 20, 30, 50].map((count) => (
                    <button 
                      key={count}
                      className={clsx(
                        "px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 relative overflow-hidden",
                        "bk-segment__item bk-focus",
                        wordCount === count 
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25' 
                          : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-300'
                      )}
                      aria-pressed={wordCount === count}
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
            <button data-lang-pill className="group px-5 py-3 rounded-2xl text-sm font-semibold bg-gray-800/50 text-gray-300 hover:bg-gray-700/60 border border-gray-700/30 hover:border-gray-600/50 backdrop-blur-sm transition-all duration-300 flex items-center gap-2 shadow-lg hover:scale-105 bk-lang bk-focus">
              <Globe className="h-4 w-4 group-hover:rotate-12 transition-transform duration-300" />
              english
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            </button>
          </div>
          {/* Floating toast anchored to language pill */}
          {!isTestComplete && <ReadyToast />}
        </div>
      </div>
      )}

      {/* Live Stats Bar - typing ONLY (hide in results) */}
      {view === 'typing' && time > 0 && !isTestComplete && (
        <div ref={statsRef} className="bk-stats-bar sticky z-40 hide-on-test" aria-hidden={view === 'typing' && !isTestComplete && time > 0}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="bk-stats-row">
              {/* WPM */}
              <div className="flex items-center gap-3 group bk-stat" role="status" aria-live="polite">
                <span className="bk-stat__icon flex items-center justify-center w-10 h-10 rounded-xl border border-yellow-400/30 bg-gradient-to-br from-yellow-400/20 to-orange-500/20">
                  <Zap className="w-5 h-5 text-yellow-400" />
                </span>
                <div>
                  <div className="text-2xl font-bold text-yellow-400 font-mono leading-none bk-stat__value">
                    {wpm}
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider bk-stat__label">WPM</div>
                </div>
              </div>

              {/* Accuracy */}
              <div className="flex items-center gap-3 group bk-stat" role="status" aria-live="polite">
                <span className="bk-stat__icon flex items-center justify-center w-10 h-10 rounded-xl border border-green-400/30 bg-gradient-to-br from-green-400/20 to-emerald-500/20">
                  <Target className="w-5 h-5 text-green-400" />
                </span>
                <div>
                  <div className="text-2xl font-bold text-green-400 font-mono leading-none bk-stat__value">
                    {accuracy}%
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider bk-stat__label">Accuracy</div>
                </div>
              </div>

              {/* Time */}
              <div className="flex items-center gap-3 group bk-stat" role="status" aria-live="polite">
                <span className="bk-stat__icon flex items-center justify-center w-10 h-10 rounded-xl border border-blue-400/30 bg-gradient-to-br from-blue-400/20 to-cyan-500/20">
                  <Timer className="w-5 h-5 text-blue-400" />
                </span>
                <div>
                  <div className="text-2xl font-bold text-blue-400 font-mono leading-none bk-stat__value">
                    {time.toFixed(1)}s
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider bk-stat__label">Time</div>
                </div>
              </div>

              {/* Smart Test badge */}
              {smartUsedDifficulty && (
                <span className="bk-badge bk-badge--fire">AI Smart Test — {smartUsedDifficulty}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Area */}
      <div className="flex-1 relative bk-surface-glow">

        {view === 'typing' && (
          <>
            {/* Loader + error UI driven by promptLoad */}
            {promptLoad === 'loading' && !currentPrompt && (
              <div className="flex flex-col items-center gap-2 text-orange-200/80 my-6">
                <div className="size-6 rounded-full border-2 border-orange-400/50 border-t-transparent animate-spin" />
                <div className="text-sm">Generating new test…</div>
                <div className="text-[11px] text-orange-200/60">Powered by model-assisted prompts</div>
              </div>
            )}
            {promptLoad === 'error' && !currentPrompt && (
              <div className="flex flex-col items-center gap-2 text-orange-200/80 my-6">
                <div className="text-sm">Couldn’t generate a test.</div>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1.5 rounded-md bg-white/10 ring-1 ring-white/15 hover:bg-white/15"
                    onClick={() => { bootLockRef.current = false; loadPromptOnce().catch(()=>{}); }}
                  >
                    Try again
                  </button>
                  <button
                    className="px-3 py-1.5 rounded-md bg-orange-500/15 ring-1 ring-orange-400/25 hover:ring-orange-300/40"
                    onClick={() => { bootLockRef.current = false; loadPromptOnce({ useFallback: true }).catch(()=>{}); }}
                  >
                    Use offline prompt
                  </button>
                </div>
                {promptError && <div className="text-[11px] opacity-70">{promptError}</div>}
              </div>
            )}

            <div className="typing-offsetter">
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
            </div>
          </>
        )}
        {view === 'results' && (
          <div className="mt-6 md:mt-10">
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
              usedConfig={lastUsedConfigRef.current}
              onNextTest={async () => { await safeRestart(); }}
            />
          </div>
        )}
      </div>

      {/* Results render via view switch above */}

      {/* Bottom Helper Bar - Only show during active typing */}
      {view === 'typing' && (
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-30 animate-in slide-in-from-bottom duration-700 hide-on-test" aria-hidden={view === 'typing' && !isTestComplete && time > 0}>
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

      {/* Old bottom-corner hint removed in favor of ReadyToTypeHint under controls */}
    </div>
  );
};

export default TypingTest;