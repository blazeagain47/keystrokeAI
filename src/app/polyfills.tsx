"use client";

declare global {
  interface Window {
    requestIdleCallback?: (
      cb: (d: { didTimeout: boolean; timeRemaining: () => number }) => void
    ) => any;
    cancelIdleCallback?: (id: any) => void;
  }
}

if (typeof window !== "undefined") {
  // requestIdleCallback polyfill
  if (!("requestIdleCallback" in window)) {
    window.requestIdleCallback = (cb) => {
      const start = Date.now();
      return setTimeout(
        () =>
          cb({
            didTimeout: false,
            timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
          }),
        1
      );
    };
    window.cancelIdleCallback = (id) => clearTimeout(id as any);
  }

  // IntersectionObserver no-op fallback
  if (typeof (globalThis as any).IntersectionObserver === "undefined") {
    (globalThis as any).IntersectionObserver = class {
      constructor() {}
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [] as any[];
      }
    } as any;
  }

  // ResizeObserver no-op fallback
  if (typeof (globalThis as any).ResizeObserver === "undefined") {
    (globalThis as any).ResizeObserver = class {
      constructor(_cb?: any) {}
      observe() {}
      unobserve() {}
      disconnect() {}
    } as any;
  }

  // iOS viewport unit helper: keep --vh in sync for older Safari
  const setVhVar = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty("--vh", `${vh}px`);
  };
  setVhVar();
  window.addEventListener("resize", setVhVar);
}

export default function Polyfills() {
  return null;
}


