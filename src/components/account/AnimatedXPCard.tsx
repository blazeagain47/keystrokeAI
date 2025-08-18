"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import CountUp from "@/components/ui/CountUp";
import FireSparkline from "@/components/ui/FireSparkline";
import { useAuth } from "@/hooks/useAuth";

type Props = {
	xpTotal: number;
	xpMax?: number;           // default 10000
	trend?: number[];
	className?: string;
};

export default function AnimatedXPCard({ xpTotal, xpMax = 10000, trend = [20,35,28,42,36,40,46,51], className }: Props) {
	const { user } = useAuth();
	const total = typeof xpTotal === "number" ? xpTotal : (user?.xpTotal ?? 0);
	const safeTotal = Math.max(0, Math.min(total, xpMax));
	const targetPct = safeTotal / xpMax;          // 0..1

	const [pct, setPct] = useState(0);            // animated 0..1
	const circleRef = useRef<SVGCircleElement>(null);
	const emberRef = useRef<SVGCircleElement>(null);
	const [reduce, setReduce] = useState(false);

	useEffect(() => {
		setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
	}, []);

	useEffect(() => {
		if (reduce) { setPct(targetPct); return; }
		let raf: number;
		const start = performance.now();
		const from = pct;
		const diff = targetPct - from;
		const dur = 1200;
		const step = (now: number) => {
			const t = Math.min(1, (now - start) / dur);
			setPct(from + diff * (1 - Math.pow(1 - t, 3))); // easeOutCubic
			if (t < 1) raf = requestAnimationFrame(step);
		};
		raf = requestAnimationFrame(step);
		return () => cancelAnimationFrame(raf);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [targetPct]);

	const { r, c, dash } = useMemo(() => {
		const r = 22; const c = 2 * Math.PI * r; return { r, c, dash: c };
	}, []);

	// stroke offset for remaining (we draw from top, clockwise)
	const offset = useMemo(() => (dash * (1 - pct)), [dash, pct]);
	const pctLabel = Math.round(pct * 100);

	return (
		<div className={`rounded-2xl p-4 border border-white/10 bg-white/5 ${className || ""}`}>
			<div className="flex items-start justify-between">
				<div className="space-y-1">
					<div className="text-sm text-white/60">Total XP</div>
					<div className="text-3xl font-semibold tabular-nums text-white/90">
						<CountUp value={safeTotal} />
					</div>
					<div className="text-xs text-white/50">Progress to next level</div>
				</div>

				{/* Fire ring */}
				<div className="relative w-[64px] h-[64px]">
					<svg viewBox="0 0 64 64" className="w-16 h-16">
						<defs>
							<linearGradient id="bkXpStroke" x1="0" y1="0" x2="1" y2="1">
								<stop offset="0" stopColor="#FF3D00"/><stop offset="0.6" stopColor="#FF6A00"/><stop offset="1" stopColor="#FFD36E"/>
							</linearGradient>
						</defs>
						{/* track */}
						<circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="6"/>
						{/* progress */}
						<circle
							ref={circleRef}
							cx="32" cy="32" r={r}
							fill="none"
							stroke="url(#bkXpStroke)"
							strokeWidth="6" strokeLinecap="round"
							strokeDasharray={dash}
							strokeDashoffset={offset}
							className="drop-shadow-[0_0_10px_rgba(255,106,0,.35)]"
							style={{ transform: "rotate(-90deg)", transformOrigin: "32px 32px" }}
						/>
						{/* ember moving along ring while filling */}
						{!reduce && pct > 0 && pct < 1 && (
							<circle
								ref={emberRef}
								cx="32" cy="32" r={r}
								pathLength={1}
								className="bk-xp-ember"
								stroke="none" fill="rgba(255,174,0,.9)"
							/>
						)}
					</svg>
					{/* center label */}
					<div className="absolute inset-0 grid place-items-center text-xs text-white/80">
						{pctLabel}%
					</div>
				</div>
			</div>

			{/* tiny trend sparkline below */}
			<div className="mt-3">
				<FireSparkline points={trend} className="w-full h-10" />
			</div>
		</div>
	);
}


