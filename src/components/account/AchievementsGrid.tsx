"use client";

import React from "react";
import { AchievementsBundle } from "@/lib/achievements";
import { Card, CardContent } from "@/components/ui/card";
import AchievementBadge from "@/components/account/AchievementBadge";

export default function AchievementsGrid({ bundle }: { bundle: AchievementsBundle }) {
  return (
    <Card className="rounded-2xl border border-white/10 bg-white/5">
      <CardContent className="p-4 md:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-white/90 font-medium">Achievements</div>
          <div className="text-white/60 text-sm">Level {bundle.level}</div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {bundle.list.map((a) => (
            <AchievementBadge key={a.id} ach={a} />
          ))}
        </div>
        <div className="text-white/50 text-xs mt-3">More coming soon</div>
      </CardContent>
    </Card>
  );
}


