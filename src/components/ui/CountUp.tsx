"use client";
import { useEffect, useState } from "react";

type Props = {
  value: number;
  duration?: number; // ms
  decimals?: number;
  className?: string;
};

export default function CountUp({ value, duration = 900, decimals = 0, className }: Props) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const from = display;
    const diff = value - from;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setDisplay(from + diff * (1 - Math.pow(1 - t, 3))); // easeOutCubic
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <span className={className}>
      {display.toFixed(decimals)}
    </span>
  );
}


