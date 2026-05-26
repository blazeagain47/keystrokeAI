"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import clsx from "clsx";

import { safeCopy } from "@/utils/safeCopy";

interface CopyCodeButtonProps {
  code: string;
  className?: string;
}

export default function CopyCodeButton({ code, className }: CopyCodeButtonProps) {
  const [copied, setCopied] = useState(false);

  const onClick = useCallback(async () => {
    const ok = await safeCopy(code);
    if (ok) setCopied(true);
  }, [code]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Copy party code"
      title="Copy"
      className={clsx(
        "inline-flex items-center gap-2 px-3 py-2 rounded-lg",
        "bg-gray-800/60 hover:bg-gray-700/70 border border-gray-700/50 hover:border-gray-600/60",
        "text-sm text-gray-200 transition-colors",
        copied && "border-emerald-400/40 text-emerald-300",
        className,
      )}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}
