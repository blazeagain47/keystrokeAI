// src/lib/caretMotion.ts
type CaretStyle = "bar" | "block" | "outline" | "underline";

export interface CaretMoverOpts {
  wrap: HTMLElement;            // [data-testid="prompt-root"]
  caret: HTMLElement;           // .bk-caret-bar
  getStyle: () => CaretStyle;   // how UI reports caret style
  getSmoothMs: () => number;    // 0|85|110|150 based on setting
}

export function createCaretMover(opts: CaretMoverOpts) {
  const { wrap, caret, getStyle, getSmoothMs } = opts;

  let rafId: number | null = null;
  let fromX = 0, fromY = 0;
  let curX = 0, curY = 0;
  let toX = 0, toY = 0;
  let startT = 0, dur = 0;
  let lastWidthPx = 0;

  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const quant = (v: number) => Math.round(v * dpr) / dpr;

  const prefersReduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

  function measure(anchor: HTMLElement | null) {
    if (!anchor) return null;

    // Screen-space rects (already affected by transforms)
    const a = anchor.getBoundingClientRect();
    const w = wrap.getBoundingClientRect();

    // Read the exact transforms we apply in this subtree
    const sVar  = getComputedStyle(wrap).getPropertyValue('--bk-prompt-scale').trim();
    const scale = sVar ? Math.max(0.001, parseFloat(sVar)) : 1;

    // Chromium/Safari expose CSS zoom; Firefox returns '' → treat as 1
    const zoomStr = (getComputedStyle(document.body) as any).zoom || '1';
    const uiZoom  = Number.isFinite(parseFloat(zoomStr)) ? Math.max(0.001, parseFloat(zoomStr)) : 1;

    // Convert screen-space rects to the caret's local (pre-transform) space
    const dezoom = scale * uiZoom;

    const screenDX = a.left - w.left;
    const screenDY = a.top  - w.top;

    let x = screenDX / dezoom;
    let y = screenDY / dezoom;

    const letterW = a.width  / dezoom;
    const letterH = a.height / dezoom;

    const style = getStyle();

    // Caret's styled width is already in local space
    const cwStr  = getComputedStyle(caret).width;
    const caretW = Number.isFinite(parseFloat(cwStr)) ? parseFloat(cwStr) : (caret.offsetWidth || 2);
    const caretH = caret.offsetHeight || letterH;

    // Vertical alignment
    if (style === "underline") {
      y = y + letterH - caretH;              // baseline
    } else {
      y = y + (letterH - caretH) / 2;        // centered
    }

    // Horizontal alignment & target width
    let widthPx: number;
    if (style === "bar") {
      x = x - caretW / 2;                    // center thin bar on glyph edge
      widthPx = caretW;
    } else {
      widthPx = Math.max(1, Math.round(letterW)); // block/outline/underline span glyph
    }

    // DPR quantize after normalization for crispness
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const q = (v: number) => Math.round(v * dpr) / dpr;

    return { x: q(x), y: q(y), widthPx, letterW, letterH };
  }

  function apply(x: number, y: number, widthPx?: number) {
    caret.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    if (widthPx != null) {
      // For block/outline/underline change the width; for bar leave as CSS var.
      const style = getStyle();
      if (style === "block" || style === "outline" || style === "underline") {
        caret.style.width = `${widthPx}px`;
      }
    }
  }

  function tick(now: number) {
    if (rafId == null) return;
    const t = dur === 0 ? 1 : Math.min(1, (now - startT) / dur);
    const k = dur === 0 ? 1 : easeOutCubic(t);
    const nx = quant(fromX + (toX - fromX) * k);
    const ny = quant(fromY + (toY - fromY) * k);
    curX = nx; curY = ny;
    apply(nx, ny, lastWidthPx);
    if (t < 1) {
      rafId = requestAnimationFrame(tick);
    } else {
      rafId = null;
      fromX = curX; fromY = curY;
    }
  }

  function animateTo(nx: number, ny: number) {
    dur = (prefersReduced ? 0 : getSmoothMs());

    fromX = curX; fromY = curY;
    toX = nx; toY = ny;
    startT = performance.now();

    if (rafId != null) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);
  }

  function toAnchor(anchor: HTMLElement | null) {
    const m = measure(anchor);
    if (!m) return;
    // prime current position if first run
    if (rafId == null && (curX === 0 && curY === 0)) {
      curX = m.x; curY = m.y; fromX = m.x; fromY = m.y;
      apply(m.x, m.y, m.widthPx);
      return;
    }
    animateTo(m.x, m.y);
  }

  function reset() {
    if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
    curX = fromX = toX = 0;
    curY = fromY = toY = 0;
  }

  return { toAnchor, reset };
}

