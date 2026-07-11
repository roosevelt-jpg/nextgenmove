/**
 * Fix integrations connectedAt values corrupted to {} by stripUndefined
 * eating FieldValue.serverTimestamp(). Run: npx tsx scripts/fix-integration-timestamps.ts
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { stripUndefined } from "../src/lib/stripUndefined";

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

function isBrokenTimestamp(value: unknown): boolean {
  if (value == null) return false;
  if (value instanceof Timestamp) return false;
  if (typeof value === "object" && value !== null && "toDate" in value) {
    return false;
  }
  // {} or other non-Timestamp objects left by the stripUndefined bug
  return typeof value === "object";
}

async function main() {
  initAdmin();
  const db = getFirestore();
  const snap = await db.collection("integrations").get();

  for (const doc of snap.docs) {
    const data = doc.data();
    if (!isBrokenTimestamp(data.connectedAt)) {
      console.log("ok", doc.id, data.status);
      continue;
    }

    const nextConnectedAt =
      data.status === "connected" ? FieldValue.serverTimestamp() : null;

    // Bypass stripUndefined for the sentinel — write FieldValue directly.
    await doc.ref.update({
      connectedAt: nextConnectedAt,
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log("fixed", doc.id, "→", data.status === "connected" ? "serverTimestamp" : "null");
  }

  // Sanity: stripUndefined must preserve FieldValue
  const sentinel = FieldValue.serverTimestamp();
  const stripped = stripUndefined({ connectedAt: sentinel });
  if (stripped.connectedAt !== sentinel) {
    throw new Error("stripUndefined still corrupts FieldValue.serverTimestamp()");
  }
  console.log("stripUndefined FieldValue check passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
