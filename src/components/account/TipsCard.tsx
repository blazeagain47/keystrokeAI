"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Flame } from "lucide-react";

export default function TipsCard({ className = "" }: { className?: string }) {
  return (
    <Card className={`rounded-2xl border border-white/10 bg-gray-900/40 backdrop-blur-md hover:shadow-[0_0_30px_rgba(255,110,0,.15)] transition-shadow ${className}`}>
      <CardContent className="p-4 md:p-5">
        <div className="flex items-center gap-2 text-base font-semibold text-white mb-2">
          <Flame className="h-4 w-4 text-orange-400" aria-hidden />
          <span>Tips</span>
        </div>
        <div className="text-white/80">Practice daily to extend your streak.</div>
      </CardContent>
    </Card>
  );
}


