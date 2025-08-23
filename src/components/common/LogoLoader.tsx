import Image from "next/image";
import React from "react";

/** Try both names; keep whichever exists in your repo. */

import logoA from "/public/blazekey-logo.png";

type Props = {
  show: boolean;
  /** Optional helper text below the logo */
  text?: string;
};

export default function LogoLoader({ show, text = "Generating new test..." }: Props) {
  if (!show) return null;
  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center pointer-events-none"
      aria-live="polite"
      aria-busy="true"
      role="status"
    >
      <div className="flex flex-col items-center gap-3 pointer-events-none">
        <div className="relative">
          <Image
            src={logoA}
            alt="blazeKey"
            width={140}
            height={140}
            priority
            className="bk-logo-glow"
          />
          {/* subtle ring, purely decorative */}
          <div className="absolute inset-0 rounded-full bk-logo-orb" aria-hidden />
        </div>

        <div className="text-white/80 text-sm font-medium tracking-wide">
          {text}
        </div>
        <div className="text-white/40 text-[11px]">Powered by AI</div>

        {/* hide “spinner” from screen readers (we expose only status text) */}
        <span className="sr-only">Loading</span>
      </div>
    </div>
  );
}


