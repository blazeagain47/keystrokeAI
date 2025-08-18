"use client";
import React, { useEffect, useMemo, useRef } from "react";

type Pt = { t: string; wpm: number; acc: number };

export default function BlazeHistoryChart({ points }: { points: Pt[] }) {
	const pathRef = useRef<SVGPathElement>(null);

	const { d } = useMemo(() => {
		const w = 600, h = 160, pad = 8;
		const ys = points.map(p => p.wpm); const xs = points.map((_,i)=>i);
		const minY = 0; const maxY = Math.max(120, ...ys);
		const stepX = (w - pad*2) / Math.max(1, points.length-1);
		const scaleX = (i:number)=> pad + i*stepX;
		const scaleY = (y:number)=> h - pad - (y - minY)/(maxY-minY||1)*(h-pad*2);
		let d = "";
		points.forEach((p,i)=>{
			const X = scaleX(i), Y = scaleY(p.wpm);
			d += i===0?`M ${X} ${Y}`:` L ${X} ${Y}`;
		});
		return { d };
	}, [points]);

	useEffect(() => {
		const el = pathRef.current; if (!el) return;
		const len = el.getTotalLength();
		el.style.strokeDasharray = `${len}`;
		el.style.setProperty("--dash", `${len}`);
		el.classList.remove("animate-draw");
		void el.getBBox();
		el.classList.add("animate-draw");
	}, [d]);

	return (
		<div className="rounded-2xl border border-white/10 bg-white/5 p-3">
			<svg viewBox="0 0 600 160" className="w-full h-[160px]">
				<defs>
					<linearGradient id="bkChart" x1="0" y1="0" x2="1" y2="0">
						<stop offset="0" stopColor="#FF3D00"/><stop offset="0.6" stopColor="#FF6A00"/><stop offset="1" stopColor="#FFD36E"/>
					</linearGradient>
				</defs>
				<path ref={pathRef} d={d} fill="none" stroke="url(#bkChart)" strokeWidth="3" className="animate-draw drop-shadow-[0_0_6px_rgba(255,106,0,.45)]"/>
			</svg>
		</div>
	);
}


