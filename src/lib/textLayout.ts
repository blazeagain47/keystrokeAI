// src/lib/textLayout.ts
export const VISIBLE_LINES = 3;

export type LineLayout = { 
  wordIndexToLine: number[]; 
  totalLines: number; 
  lineHeight: number;
};

export type WordMeasurement = {
  left: number;
  top: number;
  lineHeight: number;
};

/**
 * Compute word-to-line mapping from measured word positions
 */
export function computeWordLineLayout(
  words: string[], 
  measure: (wordIndex: number) => WordMeasurement | null
): LineLayout {
  if (!words.length) {
    return { wordIndexToLine: [], totalLines: 0, lineHeight: 38 };
  }

  // Get baseline from first measured word
  const firstMeasurement = measure(0);
  if (!firstMeasurement) {
    return { wordIndexToLine: new Array(words.length).fill(0), totalLines: 1, lineHeight: 38 };
  }

  const baseTop = firstMeasurement.top;
  const lineHeight = firstMeasurement.lineHeight;
  const wordIndexToLine: number[] = [];
  let maxLine = 0;

  // Map each word to its line number
  for (let i = 0; i < words.length; i++) {
    const measurement = measure(i);
    if (!measurement) {
      wordIndexToLine[i] = 0;
      continue;
    }
    
    const line = Math.max(0, Math.round((measurement.top - baseTop) / lineHeight));
    wordIndexToLine[i] = line;
    maxLine = Math.max(maxLine, line);
  }

  return { 
    wordIndexToLine, 
    totalLines: maxLine + 1, 
    lineHeight 
  };
}

/**
 * Calculate desired viewport top line to keep active line centered
 */
export function calculateViewportTop(
  activeLine: number, 
  totalLines: number, 
  centerOffset: number = 1
): number {
  const desiredTop = activeLine - centerOffset;
  const maxStart = Math.max(0, totalLines - VISIBLE_LINES);
  return Math.max(0, Math.min(maxStart, desiredTop));
}

/**
 * Apply viewport transform with optional smooth animation
 */
export function applyViewportTransform(
  element: HTMLElement,
  startLine: number,
  lineHeight: number,
  prefersReducedMotion: boolean = false
): void {
  const y = startLine * lineHeight;
  
  if (prefersReducedMotion) {
    element.style.transition = 'none';
    element.style.transform = `translateY(-${y}px)`;
  } else {
    element.style.transition = 'transform 120ms ease-out';
    requestAnimationFrame(() => {
      element.style.transform = `translateY(-${y}px)`;
    });
  }
}
