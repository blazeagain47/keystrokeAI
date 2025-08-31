"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/store/settings";

function setVar(name: string, value: string) {
  try { document.documentElement.style.setProperty(name, value); } catch {}
}

const PRESETS: Record<string,{h:number;s:number;l:number}> = {
  blaze:{h:24,s:95,l:55},
  ember:{h:32,s:90,l:56},
  magma:{h:8,s:92,l:55},
  plasma:{h:264,s:90,l:62},
  aurora:{h:168,s:80,l:52},
};

export function useAppearance() {
  const a = useSettingsStore(s => s.appearance);

  useEffect(() => {
    const { accent, background, glass, cards, density, type, caret, motion, contrast, charts } = a;
    const base = accent.preset !== "custom" ? PRESETS[accent.preset] : {h:accent.h,s:accent.s,l:accent.l};

    // Mirror current theme (managed by next-themes) into a data-attr for optional styling.
    try {
      const isDark = document.documentElement.classList.contains('dark');
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    } catch {}

    // Accent
    setVar("--bk-accent-h", String(base.h));
    setVar("--bk-accent-s", `${base.s}%`);
    setVar("--bk-accent-l", `${base.l}%`);
    setVar("--bk-accent", `hsl(var(--bk-accent-h) var(--bk-accent-s) var(--bk-accent-l))`);
    setVar("--bk-accent-fg", base.l > 60 ? "hsl(0 0% 10%)" : "white");

    // Background / flames (respect reduce motion + zen)
    const zen = (() => { try { return document.documentElement.dataset.zen === '1'; } catch { return false; } })();
    const reduce = Boolean(motion?.reduce);
    const motionOff = reduce || zen;
    const flameIntensity = background.flames === "off" ? 0 : background.flames === "subtle" ? 0.5 : 1;
    setVar("--bk-flame-intensity", String(motionOff ? Math.min(0.5, flameIntensity) : flameIntensity));
    setVar("--bk-sparks-enabled", motionOff ? "0" : (background.sparks ? "1" : "0"));
    setVar("--bk-vignette", background.vignette ? "1" : "0");

    // Glass
    setVar("--bk-glass-blur", `${glass.blurPx}px`);
    setVar("--bk-glass-alpha", String(glass.alpha));

    // Cards
    setVar("--bk-radius", `${cards.radius}px`);
    setVar("--bk-card-glow", cards.glow==="off" ? "0" : cards.glow==="soft" ? "0.35" : "0.7");

    // Density & Type
    setVar("--bk-density", density==="compact" ? "0.9" : "1");
    setVar("--bk-type-scale", String(type.scale));
    try { document.documentElement.dataset.font = type.family; } catch {}

    // Caret
    try { document.documentElement.dataset.caret = caret.style; } catch {}
    setVar("--bk-caret-blink", `${Math.max(300, caret.blinkMs)}ms`);
    setVar("--bk-caret-color", caret.color==="accent" ? "var(--bk-accent)" : "white");

    // Motion & contrast
    try { document.documentElement.dataset.reduceMotion = a.motion.reduce ? "1":"0"; } catch {}
    try { document.documentElement.dataset.highContrast = a.contrast.high ? "1":"0"; } catch {}

    // Charts
    try { document.documentElement.dataset.chartGlow = charts.glow; } catch {}
  }, [a]);
}

export function applyTheme(theme: 'system'|'light'|'dark') {
  // Deprecated: next-themes owns theme class toggling. Use useTheme().setTheme instead.
}


