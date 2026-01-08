// src/lib/firebaseAdmin.ts
import { cert, getApps, initializeApp, App, ServiceAccount } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

declare global {
  // eslint-disable-next-line no-var
  var __FIREBASE_ADMIN_APP__: App | undefined;
  // eslint-disable-next-line no-var
  var __FIREBASE_ADMIN_DB__: Firestore | undefined;
}

function getAdminApp(): App {
  if (!global.__FIREBASE_ADMIN_APP__) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

    // Guard: skip initialization if credentials missing (dev mode without Firebase)
    if (!projectId || !clientEmail || !privateKey) {
      console.warn("[firebaseAdmin] Missing Firebase credentials - Firebase features disabled");
      throw new Error("Firebase credentials not configured");
    }

    global.__FIREBASE_ADMIN_APP__ = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey } as ServiceAccount),
      projectId,
    });
  }
  return global.__FIREBASE_ADMIN_APP__!;
}

export function getAdminDb(): Firestore {
  if (!global.__FIREBASE_ADMIN_DB__) {
    const app = getAdminApp();
    const db = getFirestore(app);
    // IMPORTANT: do NOT call db.settings() repeatedly in dev/hot-reload.
    // If you need ignoreUndefinedProperties, set once here and never again:
    // (Uncomment ONLY if you didn't call it anywhere else)
    // db.settings({ ignoreUndefinedProperties: true });

    global.__FIREBASE_ADMIN_DB__ = db;
  }
  return global.__FIREBASE_ADMIN_DB__!;
}

// Legacy exports for compatibility - lazy getter to avoid errors on module load
let _adminDbCache: Firestore | null = null;
export const adminDb = new Proxy({} as Firestore, {
  get(_, prop) {
    if (!_adminDbCache) {
      _adminDbCache = getAdminDb();
    }
    return (_adminDbCache as any)[prop];
  }
});

// Helper functions that may be used elsewhere
export async function verifyIdTokenFromAuthHeader(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  
  const idToken = authHeader.replace("Bearer ", "");
  try {
    const { getAuth } = await import("firebase-admin/auth");
    const auth = getAuth(getAdminApp());
    return await auth.verifyIdToken(idToken);
  } catch {
    return null;
  }
}

export function serverTs() {
  const { FieldValue } = require("firebase-admin/firestore");
  return FieldValue.serverTimestamp();
}

export function inc(n: number) {
  const { FieldValue } = require("firebase-admin/firestore");
  return FieldValue.increment(n);
}

// --- dev-only diagnostics (safe, minimal) ---
export function adminDiag() {
  return {
    node: process.version,
    env: process.env.NODE_ENV,
    projectId: process.env.FIREBASE_PROJECT_ID ?? null,
    hasApp: !!global.__FIREBASE_ADMIN_APP__,
    hasDb: !!global.__FIREBASE_ADMIN_DB__,
  };
}