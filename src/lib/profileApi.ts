import { getIdTokenEnsured } from "@/lib/idToken";

export async function syncProfileUsername(username: string) {
  try {
    const token = await getIdTokenEnsured();
    await fetch("/api/profile/sync", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ username }),
      cache: "no-store",
    });
  } catch {
    // Best-effort; non-blocking for UI.
  }
}


