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
  dense?: boolean;
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

  const chipBase =
    "inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80";
  const labelCls = dense ? "text-xs" : "text-sm";

  return (
    <div className={clsx("flex flex-wrap items-center gap-2", className)}>
      <span className={clsx(chipBase, labelCls)}>{title}</span>
      {language && <span className={chipBase}>{formatSettingChip("language", String(language))}</span>}
      <span className={chipBase}>{formatSettingChip("punctuation", !!punctuation)}</span>
      <span className={chipBase}>{formatSettingChip("numbers", !!numbers)}</span>
    </div>
  );
}


