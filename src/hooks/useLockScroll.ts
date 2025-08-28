// src/hooks/useLockScroll.ts
import { useEffect } from "react";

// Module-level ref count so multiple callers can safely lock/unlock.
let lockCount = 0;

export default function useLockScroll(active = true) {
  useEffect(() => {
    if (!active) return;

    lockCount += 1;
    const html = document.documentElement;
    const body = document.body;

    const add = () => {
      html.classList.add("bk-lock");
      body.classList.add("bk-lock");
      // Avoid smooth scroll hiccups during lock/unlock
      const prev = html.style.scrollBehavior;
      html.style.scrollBehavior = "auto";
      // Store prev value on the element so cleanup can restore it
      (html as any).__bk_prevScrollBehavior = prev;
    };

    const remove = () => {
      html.classList.remove("bk-lock");
      body.classList.remove("bk-lock");
      const prev = (html as any).__bk_prevScrollBehavior ?? "";
      html.style.scrollBehavior = prev;
    };

    add();

    // Also prevent wheel/touch at the window level (some browsers ignore overflow)
    const prevent = (e: Event) => e.preventDefault();
    window.addEventListener("wheel", prevent, { passive: false });
    window.addEventListener("touchmove", prevent, { passive: false });

    return () => {
      window.removeEventListener("wheel", prevent as any);
      window.removeEventListener("touchmove", prevent as any);
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) remove();
    };
  }, [active]);
}


