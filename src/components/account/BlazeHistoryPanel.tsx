"use client";
import React, { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useStatsStore } from "@/stores/useStatsStore";
import RangeTabs from "./RangeTabs";
import BlazeHistoryChart from "./BlazeHistoryChart";
import RecentSessionsTable from "./RecentSessionsTable";
import { getLocalHistory, filterByRange, BlazeRun } from "@/lib/historyLocal";
import CountUp from "@/components/ui/CountUp";

export default function BlazeHistoryPanel() {
	const router = useRouter();
	const { user } = useAuth();
	const { range, hydrate, summary, history } = useStatsStore();

	useEffect(() => {
		if (!user) return;
		hydrate(String(user.id));
	}, [user, hydrate, range]);

	useEffect(() => {
		if (!user) return;
		const handler = (e: any) => {
			const uid = e?.detail?.uid;
			if (uid && String(user.id) === String(uid)) {
				void hydrate(String(user.id));
			}
		};
		window.addEventListener("blaze:run", handler);
		return () => window.removeEventListener("blaze:run", handler);
	}, [user, hydrate]);

	if (!user) {
		return (
			<div className="rounded-2xl border border-white/10 bg-white/5 p-6 flex items-center justify-between">
				<div className="text-white/80">Log in to view your Blaze history</div>
				<button onClick={()=>router.push("/login?from=account")} className="bk-cta"><span className="cta-main font-semibold">Log in</span></button>
			</div>
		);
	}

	const localRows: BlazeRun[] = useMemo(() => filterByRange(getLocalHistory(String(user.id)), range), [user, range]);

	return (
		<section className="space-y-4 mt-6">
			<div className="flex items-center justify-between">
				<div className="text-white/90 font-medium">Blaze history</div>
				<RangeTabs />
			</div>

			{/* Summary tiles */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="bk-tile">
					<div className="text-sm text-white/60">Total XP</div>
					<div className="text-3xl font-semibold text-fire"><CountUp value={(summary?.totalXp ?? 0) || (user?.xpTotal ?? 0)} /></div>
					<div className="text-xs text-white/50 mt-1">Progress as of selected range</div>
				</div>
				<div className="bk-tile">
					<div className="text-sm text-white/60">Current Streak</div>
					<div className="text-3xl font-semibold"><CountUp value={summary?.streakDays ?? (user?.streak ?? 0)} /></div>
					<div className="text-xs text-white/50 mt-1">days</div>
				</div>
				<div className="bk-tile">
					<div className="text-sm text-white/60">Range average</div>
					<div className="text-xl font-medium">
						<span className="text-fire font-semibold"><CountUp value={summary?.avgWpm ?? 0} /></span> WPM ·{" "}
						<span className="text-fire font-semibold"><CountUp value={summary?.avgAcc ?? 0} /></span>% acc
					</div>
					<div className="text-xs text-white/50 mt-1">{summary?.sessions ?? 0} sessions</div>
				</div>
			</div>

			{/* Chart */}
			<BlazeHistoryChart points={history ?? []} />

			{/* Table */}
			<RecentSessionsTable rows={localRows} />
		</section>
	);
}


