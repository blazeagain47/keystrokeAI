import { getIdTokenEnsured } from "@/lib/idToken";

export async function pingStreak(signal?: AbortSignal) {
  try {
    const token = await getIdTokenEnsured();
    const res = await fetch("/api/streak/ping", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal,
    });
    return await res.json().catch(() => ({}));
  } catch (e) {
    // non-fatal
    return { ok: false };
  }
}
