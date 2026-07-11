/**
 * Patch CRM CSV/Excel import labels into live Firestore.
 * Run: npx tsx scripts/patch-crm-import-labels.ts
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { stripUndefined } from "../src/lib/stripUndefined";

loadEnv({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId:
          process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.FIREBASE_PROJECT_ID!,
        clientEmail:
          process.env.FIREBASE_ADMIN_CLIENT_EMAIL ??
          process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: (
          process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? process.env.FIREBASE_PRIVATE_KEY
        )!.replace(/\\n/g, "\n"),
      }),
    });
  }

  const db = getFirestore();
  const ref = db.collection("site_settings").doc("default");
  const snap = await ref.get();
  const existing = snap.data() ?? {};
  const adminPageLabels = {
    ...((existing.adminPageLabels as Record<string, unknown>) || {}),
  };

  adminPageLabels.crm = {
    ...((adminPageLabels.crm as Record<string, string>) || {}),
    importContacts: "Import CSV / Excel",
    importTitle: "Import contacts",
    importHelp:
      "Upload a CSV or Excel (.xlsx) file. Matching emails update existing Students or Companies; new emails create CRM records (no login account).",
    importTarget: "Import into",
    importFile: "File",
    importDownloadTemplate: "Download CSV template",
    importSubmit: "Import",
    importUploading: "Importing…",
    importSuccess:
      "Imported: {created} created, {updated} updated, {skipped} skipped.",
    importError: "Import failed.",
    importMissingFile: "Choose a CSV or Excel file.",
    missing_file: "Choose a CSV or Excel file.",
    unsupported_file_type: "Use a .csv or .xlsx file.",
    empty_file: "No data rows found.",
    too_many_rows: "Too many rows (max 2000).",
    invalid_file_size: "File is empty or larger than 5MB.",
    invalid_target: "Choose Students or Companies.",
  };

  await ref.set(
    stripUndefined({
      adminPageLabels,
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );

  console.log("Patched CRM import labels");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
