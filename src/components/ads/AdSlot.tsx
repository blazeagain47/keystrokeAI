"use client";
import React, { useEffect, useRef, useState } from "react";

declare global { interface Window { adsbygoogle: any[] | undefined; } }

type AdSlotProps = {
  slot?: string;
  widthClass?: string;
  reserveHDesktop?: number;
  reserveHMobile?: number;
  className?: string;
  pageKey?: string;
  /** collapse the container until Google marks it filled */
  collapseUntilFilled?: boolean;
};

export default function AdSlot({
  slot,
  widthClass = "w-full",
  reserveHDesktop = 320,
  reserveHMobile = 280,
  className = "",
  pageKey,
  collapseUntilFilled = true,
}: AdSlotProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const insRef  = useRef<HTMLModElement | null>(null);
  const [filled, setFilled] = useState(false);

  if (!slot || !process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID) return null;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = hostRef.current;
    if (!root) return;

    const push = () => {
      try {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {}
    };

    // Request an ad immediately (don’t rely on IO when height is 0)
    push();

    // Poll for fill state on the <ins> Google mutates
    const poll = window.setInterval(() => {
      const st = (root.querySelector("ins.adsbygoogle") as HTMLInsElement | null)?.getAttribute("data-ad-status");
      if (st === "filled") {
        setFilled(true);
        window.clearInterval(poll);
      } else if (st === "unfilled") {
        setFilled(false);
      }
    }, 250);

    return () => { window.clearInterval(poll); };
  }, [slot]);

  const collapsed = collapseUntilFilled && !filled;
  return (
    <div
      ref={hostRef}
      className={`bk-ad-container mx-auto ${widthClass} ${className} grid place-items-center ${collapsed ? "h-0 overflow-hidden" : ""}`}
      style={{ minHeight: collapsed ? 0 : `clamp(${reserveHMobile}px, 35vh, ${reserveHDesktop}px)` }}
      aria-label={`ad-slot${pageKey ? `-${pageKey}` : ""}`}
      aria-hidden={collapsed ? true : undefined}
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


