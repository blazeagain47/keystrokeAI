"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function NotificationsCard({ className = "" }: { className?: string }) {
  return (
    <Card className={`rounded-2xl border border-white/10 bg-gray-900/40 backdrop-blur-md hover:shadow-[0_0_30px_rgba(255,110,0,.15)] transition-shadow ${className}`}>
      <CardContent className="p-4 md:p-5">
        <div className="text-base font-semibold text-white mb-2">Notifications</div>
        <div className="text-white/70">Coming soon</div>
      </CardContent>
    </Card>
  );
}


