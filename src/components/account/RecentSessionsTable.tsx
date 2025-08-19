"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { BlazeRun } from "@/lib/historyLocal";
import RunDetailsDrawer from "@/components/runs/RunDetailsDrawer";

type Props = { rows: BlazeRun[] };
type SortDir = "asc" | "desc";
type ModeKey = "all" | "words" | "time" | "quote" | "custom";
type DiffKey = "all" | "—" | "easy" | "normal" | "hard";

export default function RecentSessionsTable({ rows }: Props) {
	const [sortDir, setSortDir] = useState<SortDir>("desc");
	const [mode, setMode] = useState<ModeKey>("all");
	const [difficulty, setDifficulty] = useState<DiffKey>("all");
	const [page, setPage] = useState<number>(1);
	const [pageSize, setPageSize] = useState<number>(10);

	useEffect(() => {
		const v = Number((() => { try { return localStorage.getItem("bk:recent.pageSize"); } catch { return null; } })());
		if (v === 10 || v === 25 || v === 50) setPageSize(v);
	}, []);
	useEffect(() => {
		try { localStorage.setItem("bk:recent.pageSize", String(pageSize)); } catch {}
	}, [pageSize]);

	const filtered = useMemo(() => {
		let out = [...rows];
		if (mode !== "all") out = out.filter(r => (r.mode || "").toLowerCase() === mode);
		if (difficulty !== "all") {
			if (difficulty === "—") out = out.filter(r => !r.difficulty);
			else if (difficulty === "normal") out = out.filter(r => (r.difficulty || "").toLowerCase() === "normal" || (r.difficulty || "").toLowerCase() === "medium");
			else out = out.filter(r => (r.difficulty || "").toLowerCase() === difficulty);
		}
		out.sort((a,b) => sortDir === "desc" ? (b.ts - a.ts) : (a.ts - b.ts));
		return out;
	}, [rows, mode, difficulty, sortDir]);

	useEffect(() => { setPage(1); }, [mode, difficulty, sortDir]);

	const total = filtered.length;
	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const pageClamped = Math.min(Math.max(1, page), totalPages);
	const start = (pageClamped - 1) * pageSize;
	const visible = filtered.slice(start, start + pageSize);

	const chipCls = (active: boolean) => active
		? "bg-orange-500/20 text-orange-300 border-orange-500/40 shadow-[0_0_20px_rgba(255,120,0,.25)]"
		: "bg-white/5 text-white/70 border-white/10 hover:bg-white/10";

	const toCsv = useCallback((rowsCsv: BlazeRun[]) => {
		const head = ["id","ts","mode","difficulty","durationSec","words","wpm","acc","xp"];
		const esc = (v: any) => {
			const s = v == null ? "" : String(v);
			if (s.includes("\"") || s.includes(",") || s.includes("\n")) return '"' + s.replace(/"/g,'""') + '"';
			return s;
		};
		const lines = [head.join(",")];
		for (const r of rowsCsv) {
			lines.push([
				r.id,
				new Date(r.ts).toISOString(),
				r.mode ?? "",
				r.difficulty ?? "",
				r.durationSec ?? "",
				r.words ?? "",
				r.wpm ?? "",
				r.acc ?? "",
				(typeof r.xpDelta === "number" ? r.xpDelta : (typeof r.xpEarned === "number" ? r.xpEarned : "")),
			].map(esc).join(","));
		}
		return lines.join("\n");
	}, []);

	const onDownload = () => {
		const csv = toCsv(filtered);
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "blaze_sessions.csv";
		document.body.appendChild(a);
		a.click();
		a.remove();
		setTimeout(() => URL.revokeObjectURL(url), 0);
	};

	const [open, setOpen] = useState(false);
	const [selected, setSelected] = useState<BlazeRun | null>(null);
	const onRowClick = (r: BlazeRun) => { setSelected(r); setOpen(true); };

	return (
		<div className="rounded-2xl border border-white/10 bg-white/5 p-4">
			<div className="flex items-center justify-between mb-3">
				<div>
					<div className="text-white font-medium">Recent sessions</div>
					<div className="text-white/50 text-sm">{total} total</div>
				</div>
				<button onClick={onDownload} className="inline-flex items-center rounded-full px-3 py-1.5 text-sm border border-white/10 bg-white/5 hover:bg-white/10">Download CSV</button>
			</div>

			<div className="flex items-center justify-between mb-3 gap-2">
				<div className="flex items-center gap-2">
					<span className="text-white/60 text-sm">Mode:</span>
					{(["all","words","time","quote","custom"] as ModeKey[]).map(m => (
						<button key={m} onClick={() => setMode(m)} className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm border transition ${chipCls(mode===m)}`}>{m === "all" ? "All" : m}</button>
					))}
				</div>
				<div className="flex items-center gap-2">
					<span className="text-white/60 text-sm">Difficulty:</span>
					{(["all","—","easy","normal","hard"] as DiffKey[]).map(d => (
						<button key={d} onClick={() => setDifficulty(d)} className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm border transition ${chipCls(difficulty===d)}`}>{d}</button>
					))}
				</div>
			</div>

			{filtered.length === 0 ? (
				<div className="text-white/60 flex items-center justify-between">
					<div>No sessions match your filters.</div>
					<button onClick={() => { setMode("all"); setDifficulty("all"); }} className="inline-flex items-center rounded-full px-3 py-1.5 text-sm border border-white/10 bg-white/5 hover:bg-white/10">Clear filters</button>
				</div>
			) : (
				<div className="relative overflow-auto rounded-xl border border-white/5">
					<table className="w-full text-sm text-white/80">
						<thead className="sticky top-0 bg-gray-900/60 backdrop-blur supports-[backdrop-filter]:bg-gray-900/40">
							<tr className="text-white/60">
								<th className="text-left font-normal px-2 py-2 cursor-pointer select-none" onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}>When {sortDir === "desc" ? "▼" : "▲"}</th>
								<th className="text-left font-normal px-2 py-2">Mode</th>
								<th className="text-left font-normal px-2 py-2">Difficulty</th>
								<th className="text-right font-normal px-2 py-2">WPM</th>
								<th className="text-right font-normal px-2 py-2">% acc</th>
								<th className="text-right font-normal px-2 py-2">XP</th>
							</tr>
						</thead>
						<tbody>
							{visible.map((r) => (
								<tr key={r.id} className="hover:bg-white/5 cursor-pointer" role="button" tabIndex={0} aria-label={`Open run from ${new Date(r.ts).toLocaleString()}`} onClick={() => onRowClick(r)} onKeyDown={(e)=>{ if(e.key==='Enter') onRowClick(r); }}>
									<td className="px-2 py-2 whitespace-nowrap">{new Date(r.ts).toLocaleString()}</td>
									<td className="px-2 py-2">{r.mode}</td>
									<td className="px-2 py-2">{r.difficulty ?? "—"}</td>
									<td className="px-2 py-2 text-right tabular-nums">{r.wpm}</td>
									<td className="px-2 py-2 text-right tabular-nums">{r.acc}%</td>
									<td className="px-2 py-2 text-right tabular-nums">{typeof r.xpDelta === "number" ? <span className="text-fire font-medium">{r.xpDelta >= 0 ? `+${r.xpDelta}` : `${r.xpDelta}`}</span> : (typeof r.xpEarned === "number" ? <span className="text-fire font-medium">{r.xpEarned >= 0 ? `+${r.xpEarned}` : `${r.xpEarned}`}</span> : <span className="text-white/40">—</span>)} <a href={`/run/${r.id}`} onClick={(e)=>e.stopPropagation()} className="ml-2 text-white/60 hover:text-white" aria-label="Open full view">↗</a></td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			<div className="mt-3 flex items-center justify-between">
				<div className="flex items-center gap-2 text-sm text-white/70">
					<span>Rows per page</span>
					<select
						value={pageSize}
						onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
						className="bg-white/5 border border-white/10 rounded-lg px-2 py-1"
					>
						{[10,25,50].map(n => <option key={n} value={n}>{n}</option>)}
					</select>
					<span>
						{total === 0 ? "0–0" : `${start+1}–${Math.min(total, start+pageSize)}`} of {total}
					</span>
				</div>
				<div className="flex items-center gap-2">
					<button disabled={pageClamped<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-2 py-1 rounded-lg border border-white/10 disabled:opacity-40">Prev</button>
					<span className="text-sm text-white/70">{pageClamped} / {totalPages}</span>
					<button disabled={pageClamped>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="px-2 py-1 rounded-lg border border-white/10 disabled:opacity-40">Next</button>
				</div>
			</div>

			<RunDetailsDrawer run={selected} open={open} onOpenChange={setOpen} />
		</div>
	);
}



