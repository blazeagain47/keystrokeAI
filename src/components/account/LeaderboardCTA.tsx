"use client";
import Link from "next/link";
import { Trophy } from "lucide-react";

export default function LeaderboardCTA() {
  return (
    <div className="bk-fire-card p-5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-[#FF3D00]/20 to-[#FFB066]/20 ring-1 ring-orange-400/20">
          <Trophy className="h-5 w-5 text-amber-300" />
        </div>
        <div>
          <div className="text-white font-semibold">Climb the leaderboard</div>
          <div className="text-white/50 text-sm">See global rankings, trends, and your position.</div>
        </div>
      </div>
      <Link
        href="/leaderboard"
        className="px-4 py-2 rounded-xl text-sm font-medium text-white shrink-0 transition-transform hover:scale-[1.03]"
        style={{
          background: "linear-gradient(135deg, #d9460a 0%, #e8600f 50%, #f07a1a 100%)",
          boxShadow: "0 0 0 1px rgba(255,106,0,0.18) inset, 0 4px 16px -6px rgba(255,90,0,0.35)",
        }}
      >
        View leaderboard →
      </Link>
    </div>
  );
}


