"use client";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function LeaderboardCTA() {
  return (
    <Card className="rounded-2xl border border-white/10 bg-gradient-to-r from-orange-500/10 via-orange-400/5 to-amber-300/10">
      <CardContent className="p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/10 ring-1 ring-white/10">
            <Trophy className="h-5 w-5 text-amber-300" />
          </div>
          <div>
            <div className="text-white font-semibold">Climb the leaderboard</div>
            <div className="text-white/70 text-sm">See global rankings, trends, and your position.</div>
          </div>
        </div>
        <Link
          href="/leaderboard"
          className="px-3 py-1.5 rounded-xl bg-white text-black text-sm font-medium hover:opacity-90"
        >
          View leaderboard →
        </Link>
      </CardContent>
    </Card>
  );
}


