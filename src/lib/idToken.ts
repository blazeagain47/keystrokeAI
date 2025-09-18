import { auth } from "@/lib/firebase";
import { getIdToken, signInAnonymously } from "firebase/auth";

export async function getIdTokenEnsured(): Promise<string> {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
  return getIdToken(auth.currentUser!, true);
}

/**
 * Return a Firebase ID token if a real user is already signed in.
 * Does NOT sign in anonymously. Use this for routes that should not
 * create anonymous identities (e.g., /api/runs where app session should win).
 */
export async function getIdTokenOptional(): Promise<string | null> {
  try {
    if (!auth.currentUser) return null;
    return await getIdToken(auth.currentUser, true);
  } catch {
    return null;
  }
}


