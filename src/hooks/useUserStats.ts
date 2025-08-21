"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then(r => r.json());

export function useUserStats() {
  const { data, error, mutate } = useSWR("/api/stats/overview", fetcher, { revalidateOnFocus: true });
  return { stats: data as any, isLoading: !data && !error, isError: !!error, refresh: mutate };
}


