"use client";
import React, { useCallback, useEffect } from "react";
import { useStatsStore } from "@/stores/useStatsStore";
import { useAuth } from "@/hooks/useAuth";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const options = [
	{ key: "all", label: "All time" },
	{ key: "7d",  label: "Last 7 days" },
	{ key: "1d",  label: "Today" },
] as const;

export default function RangeTabs() {
	const { user } = useAuth();
	const range = useStatsStore(s => s.range);
	const setRange = useStatsStore(s => s.setRange);
	const router = useRouter();
	const pathname = usePathname();
	const search = useSearchParams();

	const applyRange = useCallback((key: "all"|"7d"|"1d") => {
		if (!user) return;
		try { localStorage.setItem("bk:range", key); } catch {}
		const sp = new URLSearchParams(search?.toString() || "");
		sp.set("range", key === "1d" ? "today" : key);
		router.replace(`${pathname}?${sp.toString()}`);
		void setRange(key as any, String(user.id));
	}, [router, pathname, search, setRange, user]);

	useEffect(() => {
		if (!user) return;
		const q = (search?.get("range") || "").toLowerCase();
		const fromUrl = q === "all" ? "all" : q === "today" ? "1d" : q === "7d" ? "7d" : null;
		const fromLS = (() => { try { return localStorage.getItem("bk:range") as any; } catch { return null; }})();
		const initial = (fromUrl || (fromLS === "all" || fromLS === "7d" || fromLS === "1d" ? fromLS : null) || "7d") as "all"|"7d"|"1d";
		if (initial !== range) {
			void setRange(initial as any, String(user.id));
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [user]);

	useEffect(() => {
		if (!user) return;
		if (pathname !== "/account") return;
		const onKey = (e: KeyboardEvent) => {
			const tag = (document.activeElement?.tagName || "").toLowerCase();
			if (tag === "input" || tag === "textarea") return;
			if (e.key === "1") return applyRange("all");
			if (e.key === "2") return applyRange("7d");
			if (e.key === "3") return applyRange("1d");
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [applyRange, pathname, user]);

	if (!user) return null;

	return (
		<div role="tablist" aria-label="History range" className="flex items-center gap-2">
			{options.map(o => {
				const active = range === o.key;
				const cls = active
				  ? "bg-orange-500/20 text-orange-300 border-orange-500/40 shadow-[0_0_20px_rgba(255,120,0,.25)]"
				  : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10";
				return (
					<button
						key={o.key}
						role="tab"
						aria-pressed={active}
						aria-selected={active}
						onClick={() => applyRange(o.key as any)}
						className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm border transition ${cls}`}
					>
						{o.label}
					</button>
				);
			})}
		</div>
	);
}


