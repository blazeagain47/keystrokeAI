"use client";

import React from "react";
import clsx from "clsx";
import { formatSettingChip } from "@/lib/tests/formatSettingChip";

type Props = {
  mode: "words" | "time" | "quote" | "zen" | "custom";
  wordCount?: number | null;
  durationSec?: number | null;
  language?: string | null;
  punctuation?: boolean | null;
  numbers?: boolean | null;
  className?: string;
  dense?: boolean; // backward-compat
  size?: "sm" | "md";
};

export default function SelectedTestChips({
  mode,
  wordCount,
  durationSec,
  language = "english",
  punctuation = false,
  numbers = false,
  className,
  dense,
  size,
}: Props) {
  const wc = Number(wordCount ?? 0);
  const title =
    mode === "words"
      ? formatSettingChip("words", Number.isFinite(wc) && wc > 0 ? wc : "—")
      : mode === "time"
      ? formatSettingChip("time", `${Number(durationSec ?? 0)}s`)
      : mode === "quote"
      ? "Quote"
      : mode === "zen"
      ? "Zen"
      : "Custom";

  const resolvedSize: "sm"|"md" = size ?? (dense ? "sm" : "md");
  const chipBase =
    resolvedSize === "sm"
      ? "inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-white/80"
      : "inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80";
  const labelCls = resolvedSize === "sm" ? "text-[11px]" : (dense ? "text-xs" : "text-sm");

  return (
    <div className={clsx(resolvedSize === "sm" ? "flex flex-wrap items-center gap-1.5" : "flex flex-wrap items-center gap-2", className)}>
      <span className={clsx(chipBase, labelCls)}>{title}</span>
      {language && <span className={chipBase}>{formatSettingChip("language", String(language))}</span>}
      <span className={chipBase}>{formatSettingChip("punctuation", !!punctuation)}</span>
      <span className={chipBase}>{formatSettingChip("numbers", !!numbers)}</span>
    </div>
  );
}


