"use client";
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { useFxEnabled, useFxIntensity } from "@/store/settings";

export type EmbersHandle = { spawn(x: number, y: number, n?: number): void };

export default forwardRef<EmbersHandle>(function EmbersLayer(_, ref) {
  const hostRef = useRef<HTMLDivElement>(null);
  const enabled = useFxEnabled();
  const intensity = useFxIntensity();
  const max = intensity === "high" ? 90 : intensity === "med" ? 60 : 36;
  const pool = useMemo<HTMLSpanElement[]>(() => [], []);

  useEffect(() => () => { pool.splice(0).forEach(el => el.remove()); }, [pool]);

  useImperativeHandle(ref, () => ({
    spawn(x: number, y: number, n = 2) {
      if (!enabled || !hostRef.current) return;
      const host = hostRef.current;
      const count = Math.min(n, 4);
      for (let i = 0; i < count; i++) {
        // reuse or create
        const s = pool.pop() ?? document.createElement("span");
        s.className = "bk-ember";
        const dx = (Math.random() - 0.5) * 10;
        const dy = (Math.random() - 0.5) * 6;
        s.style.left = `${x + dx}px`;
        s.style.top = `${y + dy}px`;
        s.onanimationend = () => { if (pool.length < max) pool.push(s); else s.remove(); };
        host.appendChild(s);
      }
      // keep pool bounded
      while (host.childNodes.length > max) host.firstChild?.remove();
    }
  }), [enabled, intensity, max, pool]);

  return <div ref={hostRef} className="pointer-events-none absolute inset-0" />;
});
