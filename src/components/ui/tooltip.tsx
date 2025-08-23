"use client";

import * as React from "react";
import * as RadixTooltip from "@radix-ui/react-tooltip";

export const TooltipProvider = RadixTooltip.Provider;

export const Tooltip = RadixTooltip.Root;

export const TooltipTrigger = RadixTooltip.Trigger;

export function TooltipContent({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <RadixTooltip.Portal>
      <RadixTooltip.Content
        side="top"
        align="center"
        className={`z-[80] rounded-md bg-black/80 text-white/90 text-xs px-3 py-2 ring-1 ring-white/10 shadow-xl backdrop-blur ${className}`}
      >
        {children}
        <RadixTooltip.Arrow className="fill-black/80" />
      </RadixTooltip.Content>
    </RadixTooltip.Portal>
  );
}


