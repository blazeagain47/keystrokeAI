"use client";
import React from "react";

type Props = {
  label: string;
  icon?: React.ReactNode;
  selected?: boolean;
  onSelect?: () => void;
  size?: "sm"|"md";
  ariaLabel?: string;
};

export default function FlameToggle({ label, icon, selected, onSelect, size="md", ariaLabel }: Props) {
  const sizeCls = size==="sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm";
  return (
    <button
      type="button"
      role="radio"
      aria-label={ariaLabel || label}
      aria-checked={selected}
      onClick={onSelect}
      className={[
        "bk-chip bk-focus", sizeCls,
        selected ? "bk-chip-active" : ""
      ].join(" ")}
    >
      {icon ? <span aria-hidden>{icon}</span> : null}
      <span className={selected ? "bk-chip-sheen" : ""}>{label}</span>
    </button>
  );
}
