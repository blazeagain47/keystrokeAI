"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function HotkeysGlobal() {
  const lastTabTs = useRef<number>(0);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Defer to TypingBox when active
      if (document.body.classList.contains("bk-typing-active")) return;

      // Skip when focused in inputs/contenteditable
      const el = e.target as HTMLElement | null;
      if (el) {
        const tag = el.tagName?.toLowerCase();
        const isInput = tag === "input" || tag === "textarea" || (el as any).isContentEditable;
        if (isInput) return;
      }

      if (e.key === "Tab") {
        lastTabTs.current = Date.now();
        e.preventDefault();
        return;
      }

      if (e.key === "Enter") {
        const dt = Date.now() - lastTabTs.current;
        if (dt >= 0 && dt <= 750) {
          e.preventDefault();
          router.push("/#new");
          lastTabTs.current = 0;
        }
      }
    };

    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [router, pathname]);

  return null;
}


