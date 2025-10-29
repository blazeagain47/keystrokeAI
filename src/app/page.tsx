"use client"

import React from 'react';
import TypingTest from '@/components/typing/TypingTest';
import AdSlot from "@/components/ads/AdSlot";

export default function HomePage() {
  return (
      <div className="min-h-dvh">
        <TypingTest />
        <section id="ad-home-below-fold" className="mt-16 md:mt-24">
          {/* Ad: Home below-fold */}
          <AdSlot
            slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME}
            pageKey="home"
          />
        </section>
      </div>
  );
}