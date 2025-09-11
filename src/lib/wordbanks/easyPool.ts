import { EN_CORE_5K } from '@/lib/wordbanks/en_core_5k';
import { BLAZE_EXTRAS_EASY_8 } from '@/lib/wordbanks/blaze_extras_easy';
import { isEasyWord } from '@/lib/prompt/easyFilter';

let CACHED: string[] | null = null;

export function getEasyPoolSync(maxLen = 8): string[] {
  if (CACHED) return CACHED;
  const base = EN_CORE_5K.filter(w => isEasyWord(w, maxLen));
  const merged = Array.from(new Set([...base, ...BLAZE_EXTRAS_EASY_8]));
  CACHED = merged;
  return CACHED;
}

let fetched = false;
export async function getEasyPool(): Promise<string[]> {
  const base = getEasyPoolSync();
  if (typeof window === 'undefined' || fetched) return base;
  try {
    const res = await fetch('/words/en_monkey_easy_8.txt', { cache: 'force-cache' });
    if (!res.ok) return base;
    const txt = await res.text();
    const extra = txt
      .split(/\r?\n/)
      .map(s => s.trim().toLowerCase())
      .filter(Boolean)
      .filter(w => isEasyWord(w, 8));
    fetched = true;
    return Array.from(new Set([...base, ...extra]));
  } catch {
    return base;
  }
}


