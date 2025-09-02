"use client";
import React from "react";

/** Animated ember glow background (non-interactive). */
export default function EmberBackdrop({
  className = "",
}: { className?: string }) {
  return (
    <div
      aria-hidden
      className={[
        "pointer-events-none absolute inset-0 overflow-hidden rounded-3xl",
        className,
      ].join(" ")}
    >
      {/* base vignette */}
      <span className="absolute -inset-10 rounded-[40px] bg-[radial-gradient(900px_520px_at_120%_120%,rgba(255,174,0,.06),transparent_55%)]" />
      {/* drifting ember */}
      <span className="absolute left-1/3 top-1/4 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(255,90,0,.18),transparent_60%)] blur-2xl animate-ember-float" />
      <span className="absolute right-10 bottom-6 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(255,180,0,.16),transparent_60%)] blur-2xl animate-ember-float-slow" />
    </div>
  );
}


