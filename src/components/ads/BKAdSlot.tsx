'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

type BKAdSlotProps = {
  /** e.g., process.env.NEXT_PUBLIC_BK_AD_SLOT_RESULTS */
  adSlot: string;
  /** optional extra classes for outer wrapper */
  className?: string;
  /** keep false if you want to always reserve height */
  collapseUntilFilled?: boolean;
};

export default function BKAdSlot({
  adSlot,
  className,
  collapseUntilFilled = true,
}: BKAdSlotProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = rootRef.current;
    if (!root) return;

    // Ensure <ins class="adsbygoogle"> exists
    let ins = root.querySelector('ins.adsbygoogle') as HTMLInsElement | null;
    if (!ins) {
      ins = document.createElement('ins');
      ins.className = 'adsbygoogle';
      ins.style.display = 'block';
      ins.style.width = '100%';
      ins.setAttribute('data-ad-client', process.env.NEXT_PUBLIC_BK_AD_CLIENT!);
      ins.setAttribute('data-ad-slot', adSlot);
      ins.setAttribute('data-ad-format', 'auto');
      ins.setAttribute('data-full-width-responsive', 'true');
      root.appendChild(ins);
    }

    // Request an ad
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error('[BKAdSlot] adsbygoogle push error', e);
    }

    // Poll for fill state
    const iv = window.setInterval(() => {
      const status = ins!.getAttribute('data-ad-status'); // 'filled' | 'unfilled' | null
      if (status === 'filled') {
        setFilled(true);
        window.clearInterval(iv);
      }
    }, 250);

    return () => window.clearInterval(iv);
  }, [adSlot]);

  return (
    <div
      ref={rootRef}
      className={clsx(
        'w-full flex items-center justify-center',
        // When not filled yet, collapse height to remove visible gap
        collapseUntilFilled && !filled
          ? 'h-0 overflow-hidden'
          : 'min-h-[90px] md:min-h-[250px]',
        className
      )}
      aria-hidden={collapseUntilFilled && !filled ? true : undefined}
    />
  );
}


