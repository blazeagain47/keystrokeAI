"use client";
import React, { useEffect, useRef } from "react";

declare global { interface Window { adsbygoogle: any[] | undefined; } }

type AdSlotProps = {
  slot?: string;
  widthClass?: string;
  reserveHDesktop?: number;
  reserveHMobile?: number;
  className?: string;
  pageKey?: string;
};

export default function AdSlot({
  slot,
  widthClass = "w-full",
  reserveHDesktop = 320,
  reserveHMobile = 280,
  className = "",
  pageKey,
}: AdSlotProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const insRef  = useRef<HTMLModElement | null>(null);

  if (!slot || !process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID) return null;

  useEffect(() => {
    if (!hostRef.current || !insRef.current) return;

    const push = () => {
      try {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {}
    };

    let io: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver((entries) => {
        const vis = entries.some((e) => e.isIntersecting);
        if (vis) { push(); io?.disconnect(); }
      }, { rootMargin: "200px 0px" });
      io.observe(hostRef.current);
    } else {
      push();
    }
    return () => { io?.disconnect(); };
  }, []);

  return (
    <div
      ref={hostRef}
      className={`bk-ad-container mx-auto ${widthClass} ${className} grid place-items-center`}
      style={{ minHeight: `clamp(${reserveHMobile}px, 35vh, ${reserveHDesktop}px)` }}
      aria-label={`ad-slot${pageKey ? `-${pageKey}` : ""}`}
    >
      <ins
        ref={insRef as any}
        className="adsbygoogle block"
        style={{ display: "block", margin: "0 auto" }}
        data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}


