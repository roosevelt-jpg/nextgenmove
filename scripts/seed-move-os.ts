/**
 * Idempotent: merge DEFAULT_MOVE_OS_LEVERS into program_levers/default.moveOs
 * and ensure companies.credits exists (0) so dual-commit can be funded.
 * Also seeds empty CMS shells for sponsor invite copy under site_settings.
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
    shadowSprintTemplates:
      Array.isArray(existing.shadowSprintTemplates) &&
      existing.shadowSprintTemplates.length > 0
        ? existing.shadowSprintTemplates
        : DEFAULT_MOVE_OS_LEVERS.shadowSprintTemplates,
    // Empty CMS shells — keep existing non-empty copy if already set.
    sponsorInviteSubject:
      typeof existing.sponsorInviteSubject === "string"
        ? existing.sponsorInviteSubject
        : "",
    sponsorInviteHtml:
      typeof existing.sponsorInviteHtml === "string"
        ? existing.sponsorInviteHtml
        : "",
  };
  await leversRef.set(
    stripUndefined({
      moveOs: next,
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );
  console.log("moveOs levers merged into program_levers/default");

  const settingsRef = adminDb.collection("site_settings").doc("default");
  const settingsSnap = await settingsRef.get();
  const settingsMoveOs = (settingsSnap.data()?.moveOs ?? {}) as Record<
    string,
    unknown
  >;
  await settingsRef.set(
    stripUndefined({
      moveOs: {
        ...settingsMoveOs,
        sponsorInviteSubject:
          typeof settingsMoveOs.sponsorInviteSubject === "string"
            ? settingsMoveOs.sponsorInviteSubject
            : "",
        sponsorInviteHtml:
          typeof settingsMoveOs.sponsorInviteHtml === "string"
            ? settingsMoveOs.sponsorInviteHtml
            : "",
      },
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );
  console.log(
    "site_settings/default.moveOs sponsor invite shells ensured (empty if unset)",
  );

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
