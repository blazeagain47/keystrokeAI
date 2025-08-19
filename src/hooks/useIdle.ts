"use client";

import { useEffect, useRef, useState } from "react";

export function useIdle(ms = 6000): boolean {
  const [idle, setIdle] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const reset = () => {
      setIdle(false);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setIdle(true), ms);
    };
    reset();
    const opts = { passive: true } as AddEventListenerOptions;
    window.addEventListener("mousemove", reset, opts);
    window.addEventListener("keydown", reset, opts);
    window.addEventListener("scroll", reset, opts);
    window.addEventListener("touchstart", reset, opts);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      window.removeEventListener("mousemove", reset);
      window.removeEventListener("keydown", reset);
      window.removeEventListener("scroll", reset);
      window.removeEventListener("touchstart", reset);
    };
  }, [ms]);

  return idle;
}


