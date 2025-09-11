"use client";

import clsx from "clsx";

type Props = {
  mode: "words" | "time" | "quote" | "zen" | "custom";
  wordCount?: number | null;
  durationSec?: number | null;
  include_punctuation?: boolean;
  include_numbers?: boolean;
  language?: string | null;
  className?: string;
};

export default function ThisTestCard({
  mode,
  wordCount,
  durationSec,
  include_punctuation,
  include_numbers,
  language = "english",
  className,
}: Props) {
  const title = "This test";
  const primary =
    mode === "words"
      ? `Words · ${wordCount ?? "—"}`
      : mode === "time"
      ? `Time · ${durationSec ?? "—"}s`
      : mode === "quote"
      ? "<> coder"
      : mode === "zen"
      ? "Zen"
      : "Custom";

  const pill = (label: string) => (
    <div className="px-3 py-1 rounded-lg bg-white/5 text-[13px] text-orange-100/90 ring-1 ring-white/10">
      {label}
    </div>
  );

  return (
    <div
      className={clsx(
        "rounded-2xl bg-black/10 ring-1 ring-white/10 backdrop-blur-md p-4 md:p-5",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_8px_30px_rgba(0,0,0,0.25)]",
        className
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[13px] tracking-wide text-orange-200/80"> {title} </span>
      </div>

      <div className="text-xl font-semibold text-orange-50">{primary}</div>

      <div className="mt-3 flex flex-wrap gap-2">
        {pill(`Language: ${String(language || "").slice(0,1).toUpperCase()}${String(language || "").slice(1)}`)}
        {pill(`Punctuation: ${include_punctuation ? "On" : "Off"}`)}
        {pill(`Numbers: ${include_numbers ? "On" : "Off"}`)}
      </div>
    </div>
  );
}


