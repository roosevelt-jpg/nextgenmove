/**
 * Patch sectioned admin settings labels.
 * Run: npx tsx scripts/patch-settings-sections-labels.ts
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

  adminPageLabels.settings = {
    ...((adminPageLabels.settings as Record<string, string>) || {}),
    settingsNavAria: "Settings sections",
    settingsNavBrand: "Brand",
    settingsNavContact: "Contact",
    settingsNavSocial: "Social",
    settingsNavSecurity: "Security",
    settingsNavMedia: "Media",
    settingsNavBilling: "Billing",
    settingsNavTeam: "Team",
    settingsBrandHelp:
      "Site name, SEO, and brand mark used across the public site and portals.",
    settingsContactHelp: "Shown on the contact page and in the site footer.",
    settingsMediaHelp:
      "YouTube playlist sync for the homepage and portal libraries.",
    contactPhone: "Contact phone",
    contactAddress: "Contact address",
    socialLinksHelp:
      "These links show as icons in the site footer and on the contact page.",
  };

  await ref.set(
    stripUndefined({
      adminPageLabels,
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );

  console.log("Patched sectioned settings labels");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
