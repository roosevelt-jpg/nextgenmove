/**
 * Patch CRM student credits labels.
 * Run: npx tsx scripts/patch-crm-credits-labels.ts
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
    credits: "Credits",
    creditHistoryTitle: "Credit history",
    creditHistoryEmpty: "No credit transactions",
    tx_stripe_topup: "Card top-up",
    tx_manual_topup: "Top-up (approved)",
    tx_redeem: "Content unlock",
    tx_referral: "Referral bonus",
    tx_welcome: "Welcome credits",
    tx_profile_complete: "Profile complete bonus",
    tx_other: "Adjustment",
  };

  await ref.set(
    stripUndefined({
      adminPageLabels,
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );

  console.log("Patched CRM credits labels");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
