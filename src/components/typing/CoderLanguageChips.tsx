"use client";

import React from "react";
import clsx from "clsx";
import type { CoderLanguage } from "@/lib/coder-snippets";

type Props = {
  value: CoderLanguage;
  onChange: (v: CoderLanguage) => void | Promise<void>;
  className?: string;
};

const LANGS: { key: CoderLanguage; label: string; icon: string }[] = [
  { key: "javascript", label: "javascript", icon: "/lang/js.svg" },
  { key: "python",     label: "python",     icon: "/lang/python.svg" },
  { key: "html",       label: "html",       icon: "/lang/html.svg" },
  { key: "css",        label: "css",        icon: "/lang/css.svg" },
  { key: "java",       label: "java",       icon: "/lang/java.svg" },
];

export function CoderLanguageChips({ value, onChange, className }: Props) {
  return (
    <div className={clsx("bk-segment", className)} role="radiogroup" aria-label="Coder languages">
      {LANGS.map(({ key, label, icon }) => (
        <button
          key={key}
          type="button"
          className={clsx("bk-segment__item bk-focus")}
          aria-pressed={value === key}
          onClick={() => onChange(key)}
          title={label}
        >
          <img src={icon} alt="" width={16} height={16} className="mr-1 inline-block" />
          {label}
        </button>
      ))}
    </div>
  );
}


