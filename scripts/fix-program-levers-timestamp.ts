/**
 * Fix program_levers/default.updatedAt corrupted to {}.
 * Run: npx tsx scripts/fix-program-levers-timestamp.ts
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";

config({ path: resolve(process.cwd(), ".env.local") });

function initAdmin() {
  if (getApps().length) return;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase Admin env vars");
  }
  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

async function main() {
  initAdmin();
  const ref = getFirestore().collection("program_levers").doc("default");
  const before = await ref.get();
  console.log("before exists", before.exists);
  console.log("before updatedAt", JSON.stringify(before.data()?.updatedAt));

  // Write a concrete Timestamp (avoids any sentinel stripping issues).
  await ref.update({
    updatedAt: Timestamp.now(),
  });

  const after = await ref.get();
  const u = after.data()?.updatedAt;
  console.log("after ctor", u?.constructor?.name);
  console.log("after toDate", typeof u?.toDate === "function" ? u.toDate().toISOString() : "none");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
