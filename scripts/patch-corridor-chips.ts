/**
 * Fix homepage crash: corridorChips stored as { chip } objects break React render.
 * Run: npx tsx scripts/patch-corridor-chips.ts
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { stripUndefined } from "../src/lib/stripUndefined";

config({ path: resolve(process.cwd(), ".env.local") });

function normalizeChip(raw: unknown): string {
  if (typeof raw === "string") return raw.trim();
  if (raw && typeof raw === "object" && "chip" in raw) {
    return String((raw as { chip?: unknown }).chip ?? "").trim();
  }
  return "";
}

async function main() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      }),
    });
  }

  const db = getFirestore();
  const ref = db.collection("page_home").doc("default");
  const snap = await ref.get();
  const data = snap.data() || {};
  const raw = data.corridorChips;
  const chips = Array.isArray(raw)
    ? raw.map(normalizeChip).filter(Boolean)
    : [];

  await ref.set(
    stripUndefined({
      corridorChips: chips,
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );

  console.log("patched corridorChips →", chips);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
