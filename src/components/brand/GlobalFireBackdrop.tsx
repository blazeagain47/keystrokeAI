"use client";
import React from "react";

export default function GlobalFireBackdrop() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  const embers = React.useMemo(() => {
    if (!mounted) return [] as Array<{ left: number; dur: number; delay: number }>;
    return Array.from({ length: 14 }).map(() => ({
      left: Math.random() * 100,
      dur: 4 + Math.random() * 4,
      delay: Math.random() * 4,
    }));
  }, [mounted]);

  return (
    <div aria-hidden className="fixed inset-0 -z-10 bk-app-bg overflow-hidden" suppressHydrationWarning>
      <div className="bk-fire-halo" />
      {/* ultra-light ember dots (client-only after mount) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {mounted && embers.map((e, i) => (
          <span
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{
              left: `${e.left}%`,
              bottom: "-6px",
              background: "rgba(255,125,50,0.75)",
              animation: `bk-ember ${e.dur}s linear ${e.delay}s infinite`,
              opacity: 0.14,
            }}
          />
        ))}
      </div>
    </div>
  );
}
