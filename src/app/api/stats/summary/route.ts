import { NextRequest, NextResponse } from "next/server";
import { API_BASE } from "@/lib/api";

export const dynamic = "force-dynamic";
export const fetchCache = "default-no-store";

export async function GET(req: NextRequest) {
	const url = new URL(req.url);
	const range = url.searchParams.get("range") || "7d";

	try {
		const res = await fetch(`${API_BASE}/stats/summary?range=${encodeURIComponent(range)}`, {
			method: "GET",
			headers: { cookie: req.headers.get("cookie") ?? "" },
			cache: "no-store",
		});
		if (res.ok) {
			const data = await res.json().catch(() => ({}));
			return NextResponse.json(data, { status: 200, headers: { "cache-control": "no-store" } });
		}
	} catch {}

	// graceful fallback — let client compute from local history
	return NextResponse.json({ detail: "fallback" }, { status: 200, headers: { "cache-control": "no-store" } });
}


