"use client";

import React, { useEffect, useRef, useState } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";

type Props = {
  value: number;
  decimals?: number;
  suffix?: string;
  className?: string;
};

/**
 * Animates from 0 up to `value` once it scrolls into view. Cheap (a single
 * spring-driven motion value, no per-frame React re-render churn beyond the
 * text node) and respects reduced-motion by snapping straight to the target.
 */
export default function CountUpNumber({ value, decimals = 0, suffix = "", className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { duration: 1000, bounce: 0 });
  const [display, setDisplay] = useState(() => (0).toFixed(decimals));

  useEffect(() => {
    if (!inView) return;
    const prefersReduced =
      typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setDisplay(value.toFixed(decimals));
    } else {
      motionVal.set(value);
    }
  }, [inView, value, motionVal, decimals]);

  useEffect(() => {
    const unsub = spring.on("change", (v) => setDisplay(v.toFixed(decimals)));
    return unsub;
  }, [spring, decimals]);

  return (
    <span ref={ref} className={className}>
      {display}
      {suffix}
    </span>
  );
}
