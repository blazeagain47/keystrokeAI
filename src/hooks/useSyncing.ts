"use client";
import { useEffect, useState } from "react";
import { useStatsStore } from "@/stores/useStatsStore";
import { useTotalsStore } from "@/stores/useTotalsStore";
import { pendingCount, onQueueChange } from "@/lib/retryQueue";

export default function useSyncing(): boolean {
  const [queueCount, setQueueCount] = useState(0);
  
  // Track history loading state
  const statsReady = useStatsStore(s => s.ready);
  const totalsLoading = useTotalsStore(s => s.loading);
  
  // Track queue count
  useEffect(() => {
    // Get initial count
    pendingCount().then(setQueueCount).catch(() => setQueueCount(0));
    
    // Subscribe to changes
    const unsubscribe = onQueueChange(setQueueCount);
    return unsubscribe;
  }, []);

  // We're syncing if:
  // - History hasn't loaded yet OR
  // - Totals are currently loading OR  
  // - There are items in the retry queue
  const isSyncing = !statsReady || totalsLoading || queueCount > 0;
  
  // Debug logging when sync state changes
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[useSyncing] syncing:', isSyncing, { 
        statsReady, 
        totalsLoading, 
        queueCount 
      });
    }
  }, [isSyncing, statsReady, totalsLoading, queueCount]);

  return isSyncing;
}
