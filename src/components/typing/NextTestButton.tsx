"use client";
import React from "react";
import { useRouter } from "next/navigation";

export default function NextTestButton() {
	const router = useRouter();
	return (
		<div className="mt-4">
			<button
				className="bk-cta-fire"
				onClick={() => router.push("/?start=1")}
				aria-label="Start next test"
			>
				<span>Next test</span>
				<div className="bk-cta-embers" aria-hidden>
					{Array.from({length: 12}).map((_,i)=>(
						<span key={i} style={{
							left: `${6 + Math.random()*80}%`,
							animationDelay: `${Math.random()*1.2}s`
						}} />
					))}
				</div>
			</button>
		</div>
	);
}


