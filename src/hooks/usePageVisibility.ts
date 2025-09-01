'use client';
import { useEffect, useState } from "react";

export default function usePageVisibility() {
  const [hidden, setHidden] = useState<boolean>(typeof document !== "undefined" ? document.hidden : false);
  const [windowFocused, setWindowFocused] = useState<boolean>(true);

  useEffect(() => {
    const onVis = () => setHidden(!!document.hidden);
    const onBlur = () => setWindowFocused(false);
    const onFocus = () => setWindowFocused(true);
    try { document.addEventListener("visibilitychange", onVis); } catch {}
    try { window.addEventListener("blur", onBlur); } catch {}
    try { window.addEventListener("focus", onFocus); } catch {}
    return () => {
      try { document.removeEventListener("visibilitychange", onVis); } catch {}
      try { window.removeEventListener("blur", onBlur); } catch {}
      try { window.removeEventListener("focus", onFocus); } catch {}
    };
  }, []);

  return { hidden, windowFocused, outOfFocus: hidden || !windowFocused };
}


