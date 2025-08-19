"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import RunDetailsCard from "@/components/runs/RunDetailsCard";
import { useStatsStore } from "@/stores/useStatsStore";
import { BlazeRun, getLocalHistory } from "@/lib/historyLocal";
import { useAuthStore } from "@/store/auth";

export default function RunDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || "");
  const history = useStatsStore(s => s.history) || [];
  const user = useAuthStore(s => s.user);
  const [run, setRun] = useState<BlazeRun | null>(null);

  const fromStore = useMemo(() => history.find((p: any) => p && (p as any).id === id) as BlazeRun | undefined, [history, id]);

  useEffect(() => {
    if (fromStore) { setRun(fromStore); return; }
    // fallback to local history
    try {
      if (user) {
        const local = getLocalHistory(String(user.id));
        const found = local.find(r => r.id === id) || null;
        setRun(found);
      }
    } catch { setRun(null); }
  }, [fromStore, id, user]);

  if (!id) return null;

  return (
    <div className="max-w-3xl mx-auto p-6">
      {!run ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
          <div>Run not found.</div>
          <button className="mt-3 px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/10" onClick={() => router.replace("/account")}>Back to account</button>
        </div>
      ) : (
        <RunDetailsCard run={run} showOpenLink={false} />
      )}
    </div>
  );
}


