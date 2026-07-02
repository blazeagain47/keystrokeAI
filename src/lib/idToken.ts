import { auth } from "@/lib/firebase";
import { getIdToken } from "firebase/auth";

/**
 * Return a Firebase ID token if a real (non-anonymous) user is already
 * signed in. Does NOT sign in anonymously — the app's identity system is
 * the username/password session cookie (see src/lib/appSession.ts); Firebase
 * anonymous auth previously caused user data to be split across two
 * identities and is intentionally not used anymore.
 */
export async function getIdTokenOptional(): Promise<string | null> {
  try {
    if (!auth.currentUser) return null;
    return await getIdToken(auth.currentUser, true);
  } catch {
    return null;
  }
}
