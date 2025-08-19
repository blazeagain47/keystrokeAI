"use client";

import React from "react";
import { BlazeRun } from "@/lib/historyLocal";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  run: BlazeRun;
  onClose?: () => void;
  showClose?: boolean;
  showOpenLink?: boolean;
  className?: string;
};

function formatDuration(seconds?: number) {
  const s = Math.max(0, Math.floor(Number(seconds || 0)));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, "0")}`;
}

export default function RunDetailsCard({ run, onClose, showClose = false, showOpenLink = true, className = "" }: Props) {
  const xp = typeof run.xpDelta === "number" ? run.xpDelta : (typeof run.xpEarned === "number" ? run.xpEarned : 0);
  const when = new Date(run.ts).toLocaleString();
  const diff = run.difficulty ?? "—";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${location.origin}/run/${run.id}`);
    } catch {}
  };

  return (
    <Card className={`rounded-2xl border border-white/10 bg-gray-900/70 backdrop-blur-md ${className}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-white/80 text-sm">Session details</div>
            <div className="text-xs text-white/40">{run.id.slice(0, 8)}…</div>
          </div>
          {showClose && (
            <button onClick={onClose} aria-label="Close" className="px-2 py-1 rounded-lg border border-white/10 hover:bg-white/10 text-sm">×</button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-white/60">When</div>
            <div className="text-white/90">{when}</div>
          </div>
          <div>
            <div className="text-white/60">Mode / Difficulty</div>
            <div className="text-white/90">{run.mode} · {diff}</div>
          </div>
          <div>
            <div className="text-white/60">Duration</div>
            <div className="text-white/90">{formatDuration(run.durationSec)}</div>
          </div>
          <div>
            <div className="text-white/60">Words</div>
            <div className="text-white/90">{run.words ?? "—"}</div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
            <div className="text-xs text-white/60">WPM</div>
            <div className="text-2xl font-semibold text-fire tabular-nums">{run.wpm}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
            <div className="text-xs text-white/60">Accuracy</div>
            <div className="text-2xl font-semibold text-fire tabular-nums">{run.acc}%</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
            <div className="text-xs text-white/60">XP</div>
            <div className="text-2xl font-semibold text-fire tabular-nums">{xp >= 0 ? `+${xp}` : `${xp}`}</div>
          </div>
        </div>

        {showOpenLink && (
          <div className="mt-5 flex items-center gap-2">
            <a href={`/run/${run.id}`} className="inline-flex items-center rounded-full px-3 py-1.5 text-sm border border-white/10 bg-white/5 hover:bg-white/10">Open full view</a>
            <button onClick={copyLink} className="inline-flex items-center rounded-full px-3 py-1.5 text-sm border border-white/10 bg-white/5 hover:bg-white/10">Copy link</button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


