"use client";
import React from "react";
import { useStatsStore } from "@/stores/useStatsStore";
import { useAuth } from "@/hooks/useAuth";

const options = [
	{ key: "all", label: "All time" },
	{ key: "7d",  label: "Last 7 days" },
	{ key: "1d",  label: "Today" },
] as const;

export default function RangeTabs() {
	const { user } = useAuth();
	const range = useStatsStore(s => s.range);
	const setRange = useStatsStore(s => s.setRange);

	if (!user) return null;

	return (
		<div role="tablist" aria-label="History range" className="flex items-center gap-2">
			{options.map(o => {
				const active = range === o.key;
				return (
					<button
						key={o.key}
						role="tab"
						aria-selected={active}
						onClick={() => setRange(o.key as any, String(user.id))}
						className={`bk-chip bk-focus ${active ? "bk-chip-active" : ""}`}
					>
						{o.label}
					</button>
				);
			})}
		</div>
	);
}


