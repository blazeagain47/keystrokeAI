// scripts/seed_totals.ts
import { getAdminDb } from "@/lib/firebaseAdmin";

(async () => {
  const db = getAdminDb();
  const seed = [
    { id: "testuser_001", username: "sathya_demo", totalXP: 2092, bestWpm: 114, streakDays: 2 },
    { id: "testuser_002", username: "x751_demo", totalXP: 1746, bestWpm: 115, streakDays: 0 },
  ];
  const batch = db.batch();
  seed.forEach((u) => {
    const ref = db.collection("user_totals_v1").doc(u.id);
    batch.set(
      ref,
      {
        username: u.username,
        totalXP: u.totalXP,
        bestWpm: u.bestWpm,
        streakDays: u.streakDays,
        lastActiveUTC: Date.now(),
      },
      { merge: true }
    );
  });
  await batch.commit();
  // eslint-disable-next-line no-console
  console.log("Seeded totals:", seed.map((s) => s.id));
})();


