/**
 * Patch workspace preview / impersonation CMS labels.
 * Run: npx tsx scripts/patch-workspace-impersonation-labels.ts
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

  adminPageLabels.shell = {
    ...((adminPageLabels.shell as Record<string, string>) || {}),
    workspacePreviewBanner:
      "Admin preview — read-only shell. Open CRM for live student and employer records.",
    workspaceImpersonationBanner: "Viewing as {name}.",
    openCrm: "Open CRM",
    exitImpersonation: "Exit view-as",
    viewAsUser: "View as user",
    previewReadonly: "Preview is read-only.",
  };

  adminPageLabels.users = {
    ...((adminPageLabels.users as Record<string, string>) || {}),
    viewAsUser: "View as user",
    viewAsError: "Could not open portal.",
  };

  adminPageLabels.crm = {
    ...((adminPageLabels.crm as Record<string, string>) || {}),
    viewAsUser: "View as user",
    viewAsError: "Could not open portal.",
  };

  await ref.set(
    stripUndefined({
      adminPageLabels,
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );

  console.log("Patched workspace preview / impersonation labels");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
