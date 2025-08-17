"use client";
import { useEffect, useMemo, useState } from "react";

type Ember = { id: number; left: number; delay: number; size: number; duration: number };

export default function EmberField({ count = 10 }: { count?: number }) {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  const embers: Ember[] = useMemo(() => (
    Array.from({ length: count }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 6,
      size: 2 + Math.random() * 3,
      duration: 4 + Math.random() * 6,
    }))
  ), [count]);

  if (reduce) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {embers.map(e => (
        <span
          key={e.id}
          style={{
            left: `${e.left}%`,
            bottom: "-8px",
            width: e.size,
            height: e.size,
            animation: `ember-float ${e.duration}s linear ${e.delay}s infinite`,
          }}
          className="absolute rounded-full bg-[rgba(255,125,50,0.9)] blur-[0.5px]"
        />
      ))}
    </div>
  );
}


