/**
 * Idempotent: merge DEFAULT_MOVE_OS_LEVERS into program_levers/default.moveOs
 * and ensure companies.credits exists (0) so dual-commit can be funded.
 *
 * Usage: npx tsx scripts/seed-move-os.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../src/lib/firebase-admin";
import { DEFAULT_MOVE_OS_LEVERS } from "../src/lib/move-os/config";
import { stripUndefined } from "../src/lib/stripUndefined";

async function main() {
  const leversRef = adminDb.collection("program_levers").doc("default");
  const snap = await leversRef.get();
  const existing = (snap.data()?.moveOs ?? {}) as Record<string, unknown>;
  const next = {
    ...DEFAULT_MOVE_OS_LEVERS,
    ...existing,
    evidenceKindWeights: {
      ...DEFAULT_MOVE_OS_LEVERS.evidenceKindWeights,
      ...((existing.evidenceKindWeights as Record<string, number>) ?? {}),
    },
  };
  await leversRef.set(
    stripUndefined({
      moveOs: next,
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );
  console.log("moveOs levers merged into program_levers/default");

  const companies = await adminDb.collection("companies").limit(200).get();
  let patched = 0;
  for (const doc of companies.docs) {
    if (typeof doc.data()?.credits === "number") continue;
    await doc.ref.set(
      stripUndefined({
        credits: 0,
        updatedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true },
    );
    patched += 1;
  }
  console.log(`companies.credits initialized on ${patched} docs (missing field only)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
