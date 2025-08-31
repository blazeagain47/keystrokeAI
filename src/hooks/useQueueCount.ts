"use client";
import { useEffect, useState } from "react";
export function useQueueCount() {
  const [n, setN] = useState(0);
  useEffect(() => {
    let t: any;
    async function tick() {
      try {
        const { kv } = await import("@/lib/safeKeyval");
        const q = await kv.get<any[]>("bk_retry_queue_v1");
        setN(q?.length ?? 0);
      } catch {}
      t = setTimeout(tick, 3000);
    }
    tick();
    return () => clearTimeout(t);
  }, []);
  return n;
}


