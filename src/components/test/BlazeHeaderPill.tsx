"use client";

export default function BlazeHeaderPill() {
  return (
    <div className="mb-3 md:mb-4">
      <div
        className="
          inline-flex items-center gap-2
          rounded-full px-3.5 py-1.5
          bg-white/5 ring-1 ring-white/10
          text-[11px] tracking-wider uppercase text-white/80
        "
        aria-label="Blaze stats header"
      >
        <span className="relative inline-flex">
          <span className="absolute inset-0 rounded-full blur-[6px] bg-white/25" />
          <span className="relative block size-2 rounded-full bg-white/70" />
        </span>
        <span>Blaze stats</span>
        <span className="hidden md:inline text-white/60 normal-case">
          AI adapts the next typing prompt to your skill.
        </span>
      </div>
    </div>
  );
}


