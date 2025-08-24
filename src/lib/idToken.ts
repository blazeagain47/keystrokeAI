import { auth } from "@/lib/firebase";
import { getIdToken, signInAnonymously } from "firebase/auth";

export async function getIdTokenEnsured(): Promise<string> {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
  return getIdToken(auth.currentUser!, true);
}


