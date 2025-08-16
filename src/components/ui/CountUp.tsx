"use client";
import { motion, useMotionValue, useTransform, animate, useReducedMotion } from "framer-motion";
import React from "react";

type CountUpProps = {
  to: number;
  duration?: number; // seconds
  className?: string;
};

export default function CountUp({ to, duration = 1.2, className }: CountUpProps) {
  const prefersReducedMotion = useReducedMotion();
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v).toLocaleString());
  React.useEffect(() => {
    const controls = animate(mv, to, {
      duration: prefersReducedMotion ? 0 : duration,
      ease: [0.16, 1, 0.3, 1],
    });
    return controls.stop;
  }, [to, duration, prefersReducedMotion, mv]);

  return (
    <motion.span
      className={className}
      initial={{ y: prefersReducedMotion ? 0 : 8, scale: prefersReducedMotion ? 1 : 0.98, opacity: 0 }}
      animate={{ y: 0, scale: 1, opacity: 1 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.5, ease: "easeOut" }}
    >
      {rounded}
    </motion.span>
  );
}


