"use client";
import { useEffect, useRef } from "react";

type Props = {
  className?: string;
  height?: number;    // default 6
  rounded?: boolean;  // default true
};

export default function FireProgress({ className, height = 6, rounded = true }: Props) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced && barRef.current) {
      barRef.current.style.animation = "none";
    }
  }, []);

  return (
    <div
      className={`relative w-full overflow-hidden ring-1 ring-white/10 bg-white/5 ${rounded ? "rounded-full" : ""} ${className || ""}`}
      style={{ height }}
    >
      {/* base gradient */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,61,0,.25),rgba(255,106,0,.25),rgba(255,211,110,.2))]" />
      {/* moving spark */}
      <div
        ref={barRef}
        className="absolute inset-y-0 w-1/5 bk-spark-run"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,174,0,.75), rgba(255,106,0,.9), transparent)",
          filter: "drop-shadow(0 0 8px rgba(255,106,0,.5))",
        }}
      />
    </div>
  );
}


