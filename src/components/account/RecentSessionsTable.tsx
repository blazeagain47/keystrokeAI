"use client";
import React from "react";
import { BlazeRun } from "@/lib/historyLocal";

export default function RecentSessionsTable({ rows }: { rows: BlazeRun[] }) {
	return (
		<div className="rounded-2xl border border-white/10 bg-white/5 p-4">
			<div className="text-white font-medium mb-1">Recent sessions</div>
			<div className="text-white/50 text-sm mb-3">Last 10 runs</div>
			{rows.length === 0 ? (
				<div className="text-white/60">No sessions yet.</div>
			) : (
				<div className="grid grid-cols-6 gap-2 text-sm text-white/80">
					<div className="text-white/60">When</div>
					<div className="text-white/60">Mode</div>
					<div className="text-white/60">Difficulty</div>
					<div className="text-white/60">WPM</div>
					<div className="text-white/60">% acc</div>
					<div className="text-white/60 text-right">XP</div>
					{rows.slice(0,10).map((r,i)=>(
						<React.Fragment key={r.id + i}>
							<div>{new Date(r.ts).toLocaleString()}</div>
							<div>{r.mode}</div>
							<div>{r.difficulty ?? "—"}</div>
							<div className="tabular-nums">{r.wpm}</div>
							<div className="tabular-nums">{r.acc}%</div>
							<div className="text-right tabular-nums">{typeof r.xpDelta === "number" ? <span className="text-fire font-medium">{r.xpDelta >= 0 ? `+${r.xpDelta}` : `${r.xpDelta}`}</span> : <span className="text-white/40">—</span>}</div>
						</React.Fragment>
					))}
				</div>
			)}
		</div>
	);
}



