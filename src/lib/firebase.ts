// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// NOTE: Do not import firebase/analytics at module scope (breaks SSR/prerender).
// We'll lazy-load it in the browser only (see ensureClientAnalytics below).

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAAhuXmvIW9p7nL3mx6pW8FJc-vL8HyoBE",
  authDomain: "keystroke-ai-879a4.firebaseapp.com",
  projectId: "keystroke-ai-879a4",
  storageBucket: "keystroke-ai-879a4.firebasestorage.app",
  messagingSenderId: "727172748989",
  appId: "1:727172748989:web:b1004f353efae605f989d4",
  measurementId: "G-XGYT4PBXRM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Analytics (only via lazy helper; do not call at module scope)
export const analytics = null as unknown as any;

export default app;

// Browser-only, safe analytics initializer.
// Call this from a *client component's* useEffect if you want Analytics.
// It is a no-op on the server.
export async function ensureClientAnalytics(appParam?: import("firebase/app").FirebaseApp | null) {
  if (typeof window === "undefined") return null;
  try {
    const { isSupported, getAnalytics } = await import("firebase/analytics");
    if (await isSupported()) {
      const theApp = (appParam ?? (await (async () => {
        const { getApps, getApp, initializeApp } = await import("firebase/app");
        // Reuse existing app or initialize here if needed (keep your existing config).
        return getApps().length ? getApp() : initializeApp({
          apiKey: "AIzaSyAAhuXmvIW9p7nL3mx6pW8FJc-vL8HyoBE",
          authDomain: "keystroke-ai-879a4.firebaseapp.com",
          projectId: "keystroke-ai-879a4",
          storageBucket: "keystroke-ai-879a4.firebasestorage.app",
          messagingSenderId: "727172748989",
          appId: "1:727172748989:web:b1004f353efae605f989d4",
          measurementId: "G-XGYT4PBXRM"
        });
      })()));
      return getAnalytics(theApp);
    }
  } catch {
    // Silently ignore unsupported environments.
  }
  return null;
}