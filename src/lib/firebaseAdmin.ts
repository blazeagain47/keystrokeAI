import * as admin from "firebase-admin";

let app: admin.app.App;

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    const msg = "Missing Firebase Admin env vars. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.";
    if (process.env.NODE_ENV !== "production") {
      console.error("[firebaseAdmin] env missing", {
        hasProjectId: !!projectId,
        hasClientEmail: !!clientEmail,
        hasPrivateKey: !!privateKey,
      });
    }
    throw new Error(msg);
  }

  app = admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
} else {
  app = admin.app();
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export const serverTs = () => admin.firestore.FieldValue.serverTimestamp();
export const inc = (n: number) => admin.firestore.FieldValue.increment(n);
export const getAdminDb = () => adminDb;

export async function verifyIdTokenFromAuthHeader(authHeader?: string | null) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length);
  try {
    return await adminAuth.verifyIdToken(token);
  } catch (e: any) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[firebaseAdmin] verifyIdToken failed", { name: e?.name, code: e?.code, message: e?.message });
    }
    return null;
  }
}

export function adminDiag() {
  return {
    hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
    hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
    hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
  };
}


