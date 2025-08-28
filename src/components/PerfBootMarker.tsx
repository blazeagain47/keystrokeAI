"use client";
import { useEffect } from "react";
import { mark } from "@/lib/perf";

export default function PerfBootMarker() {
  useEffect(() => { mark("boot:start"); }, []);
  return null;
}
