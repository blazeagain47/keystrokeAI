"use client";
import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Props = { className?: string; variant?: "account" | "test" };

export default function CommandHintsFloating({ className, variant = "test" }: Props) {
	const router = useRouter();
	const lastTabTs = useRef<number | null>(null);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Tab") { lastTabTs.current = Date.now(); return; }
			if (e.key === "Enter") {
				const ok = lastTabTs.current && (Date.now() - lastTabTs.current) < 800;
				if (ok) { e.preventDefault(); router.push("/?start=1"); }
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [router]);

	return (
		<aside aria-label="Commands" className={`hidden lg:flex bk-commands-aside ${className || ""}`}>
			<div className="bk-fire-card px-3 py-2 rounded-2xl border border-white/10 shadow-bk-sm min-w-[220px]">
				<div className="text-white/80 text-sm font-medium mb-2">Commands</div>
				<ul className="space-y-2 text-white/75 text-sm">
					<li className="flex items-center gap-2">
						<kbd className="bk-chip px-2 py-0.5">Tab</kbd>
						<span className="text-white/50">then</span>
						<kbd className="bk-chip px-2 py-0.5">Enter</kbd>
						<span className="ml-1">New text</span>
					</li>
					<li className="flex items-center gap-2">
						<kbd className="bk-chip px-2 py-0.5">Space</kbd><span>Next word</span>
					</li>
					<li className="flex items-center gap-2">
						<kbd className="bk-chip px-2 py-0.5">Backspace</kbd><span>Go back</span>
					</li>
				</ul>
			</div>
		</aside>
	);
}


