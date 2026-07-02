export async function syncProfileUsername(username: string) {
  try {
    await fetch("/api/profile/sync", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username }),
      cache: "no-store",
    });
  } catch {
    // Best-effort; non-blocking for UI.
  }
}
