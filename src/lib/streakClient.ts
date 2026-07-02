export async function pingStreak(signal?: AbortSignal) {
  try {
    const res = await fetch("/api/streak/ping", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      signal,
    });
    return await res.json().catch(() => ({}));
  } catch (e) {
    // non-fatal
    return { ok: false };
  }
}
