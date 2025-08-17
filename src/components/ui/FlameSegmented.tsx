"use client";
import React, { useCallback } from "react";
import FlameToggle from "./FlameToggle";

type Props = { value: number; options: number[]; onChange: (v:number)=>void; };
export default function FlameSegmented({ value, options, onChange }: Props) {
  const onKey = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const idx = options.indexOf(value);
    if (e.key === "ArrowRight") onChange(options[Math.min(idx+1, options.length-1)]);
    if (e.key === "ArrowLeft") onChange(options[Math.max(idx-1, 0)]);
    if (e.key === "Home") onChange(options[0]);
    if (e.key === "End") onChange(options[options.length-1]);
  }, [value, options, onChange]);

  return (
    <div role="radiogroup" aria-label="Test duration" className="bk-segment" tabIndex={0} onKeyDown={onKey}>
      {options.map(opt => (
        <FlameToggle
          key={opt}
          label={String(opt)}
          selected={opt===value}
          onSelect={() => onChange(opt)}
          size="sm"
          ariaLabel={`${opt} seconds`}
        />
      ))}
    </div>
  );
}
