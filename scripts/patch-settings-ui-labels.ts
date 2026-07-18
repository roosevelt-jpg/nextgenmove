/**
 * Patch admin settings tab / section labels.
 * Run: npx tsx scripts/patch-settings-ui-labels.ts
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
    settingsTitle: "Workspace settings",
    workspaceEyebrow: "Admin · Settings",
    workspaceSubtitle:
      "Brand, contact, social, security, and media — edited in focused sections.",
    settingsNavAria: "Settings sections",
    tabBrand: "Brand",
    tabContact: "Contact",
    tabSocial: "Social",
    tabSecurity: "Security",
    tabBilling: "Billing",
    tabMedia: "Media",
    tabTeam: "Team",
    brandSectionTitle: "Brand",
    brandSectionBody: "Public site name, tagline, and default SEO.",
    contactSectionTitle: "Contact details",
    contactSectionBody:
      "Shown on the contact page and used for public mailto / tel links.",
    securitySectionBody: "Access controls for the admin workspace.",
    billingSectionBody: "Operator plan label and billing portal link.",
    mediaSectionTitle: "YouTube media",
    mediaSectionBody: "Playlist sync for homepage and portal video library.",
    youtubeSyncEnabledHelp: "When off, cron and Sync now skip the YouTube pull.",
    socialMediaTitle: "Social media",
    socialLinksHelp:
      "These links show as icons in the site footer and on the contact page.",
    saveSuccess: "Saved.",
    saveError: "Could not save.",
    saving: "Saving…",
  };

  const settingsMap = adminPageLabels.settings as Record<string, string>;
  delete settingsMap.footerCopyright;
  delete settingsMap.footerAttributionPrefix;
  delete settingsMap.footerAttributionName;
  delete settingsMap.footerAttributionUrl;

  await ref.set(
    stripUndefined({
      adminPageLabels,
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );

  console.log("Patched admin settings UI labels");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
