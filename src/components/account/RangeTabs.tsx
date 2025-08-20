"use client";
import { useEffect } from "react";
import { useStatsStore } from "@/stores/useStatsStore";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function RangeTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const range = useStatsStore(s => s.range);
  const setRange = useStatsStore(s => s.setRange);

  // URL → store on first mount
  useEffect(() => {
    const q = search.get("range");
    const mapped = q === "today" ? "1d" : q === "all" ? "all" : q === "7d" ? "7d" : null;
    if (mapped && mapped !== range) setRange(mapped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keyboard shortcuts
  useEffect(() => {
    const set = (r: "all"|"7d"|"1d") => {
      setRange(r);
      const qs = new URLSearchParams(search.toString());
      qs.set("range", r === "1d" ? "today" : r);
      router.replace(`${pathname}?${qs.toString()}`, { scroll: false });
    };
    const onKey = (e: KeyboardEvent) => {
      if (["INPUT","TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === "1") set("all");
      if (e.key === "2") set("7d");
      if (e.key === "3") set("1d");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pathname, router, search, setRange]);

  const click = (r: "all"|"7d"|"1d") => {
    setRange(r);
    const qs = new URLSearchParams(search.toString());
    qs.set("range", r === "1d" ? "today" : r);
    router.replace(`${pathname}?${qs.toString()}`, { scroll: false });
  };

  return (
    <div className="flex gap-2">
      <button onClick={() => click("all")}  className={chip(range==="all")}>All time</button>
      <button onClick={() => click("7d")}  className={chip(range==="7d")}>Last 7 days</button>
      <button onClick={() => click("1d")}  className={chip(range==="1d")}>Today</button>
    </div>
  );
}

const chip = (active:boolean) =>
  `px-3 py-1 rounded-full border ${active ? "bg-orange-600/30 border-orange-500 text-white" : "border-white/20 text-white/80 hover:text-white"}`;


