"use client";

import React, { useCallback, useRef } from "react";
import clsx from "clsx";

import { CODE_LENGTH } from "@/lib/party/codeShape";

interface CodeInputProps {
  value: string;
  onChange: (next: string) => void;
  onSubmit?: () => void;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  "aria-label"?: string;
}

/**
 * Single-line 6-digit numeric input for party codes.
 * - Strips non-digits on every keystroke and on paste.
 * - Clamps to CODE_LENGTH (6).
 * - Submits on Enter when full.
 * - Uses monospace + tracking so it reads as a code, not a number.
 */
export default function CodeInput({
  value,
  onChange,
  onSubmit,
  disabled,
  autoFocus,
  className,
  "aria-label": ariaLabel = "Party code",
}: CodeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const sanitize = useCallback((raw: string): string => {
    const digitsOnly = raw.replace(/\D+/g, "");
    return digitsOnly.slice(0, CODE_LENGTH);
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(sanitize(e.target.value));
    },
    [onChange, sanitize],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      const pasted = e.clipboardData.getData("text") ?? "";
      const next = sanitize(pasted);
      if (next.length > 0) {
        e.preventDefault();
        onChange(next);
      }
    },
    [onChange, sanitize],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && value.length === CODE_LENGTH) {
        e.preventDefault();
        onSubmit?.();
      }
    },
    [onSubmit, value.length],
  );

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={handleChange}
      onPaste={handlePaste}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      autoFocus={autoFocus}
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="off"
      maxLength={CODE_LENGTH}
      placeholder="000000"
      aria-label={ariaLabel}
      className={clsx(
        "w-full px-5 py-3 rounded-xl",
        "bg-gray-900/60 border border-gray-700/50 hover:border-gray-600/70 focus:border-orange-400/60",
        "text-center font-mono text-2xl tracking-[0.4em] text-gray-100 placeholder:text-gray-600",
        "outline-none focus:ring-2 focus:ring-orange-400/30",
        "transition-colors",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
    />
  );
}
