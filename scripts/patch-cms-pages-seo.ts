/**
 * Patch site branding/SEO settings + CMS page admin labels.
 * Run: npx tsx scripts/patch-cms-pages-seo.ts
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { stripUndefined } from "../src/lib/stripUndefined";

config({ path: resolve(process.cwd(), ".env.local") });

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
  const settingsRef = db.collection("site_settings").doc("default");
  const snap = await settingsRef.get();
  const existing = snap.data() || {};
  const adminPageLabels =
    (existing.adminPageLabels as Record<string, Record<string, string>>) || {};
  const settingsLabels = {
    ...(adminPageLabels.settings ?? {}),
    siteDescription: "Site description",
    faviconUrl: "Favicon",
    defaultMetaTitle: "Default meta title",
    defaultMetaDescription: "Default meta description",
    title: "Page name",
    slug: "URL slug",
    metaTitle: "SEO / meta title",
    metaDescription: "SEO / meta description",
    navLabel: "Nav / link label",
    showInHeader: "Show in header navigation",
    footerGroup: "Show in footer column",
    footerGroupNone: "None (hidden from footer)",
    footerGroupCompany: "Company",
    footerGroupTalent: "Talent",
    footerGroupEmployers: "Employers",
    createTitle: "Create page",
    editTitle: "Edit page",
    eyebrow: "Eyebrow",
    headline: "Headline",
    body: "Body",
    status: "Status",
  };
  const contentLabels = {
    ...(adminPageLabels.content ?? {}),
    pagesTitle: "Custom pages",
    pages: "Custom pages",
    createTitle: "Create page",
    editTitle: "Edit page",
    delete: "Delete",
    deleteError: "Could not delete.",
  };

  await settingsRef.set(
    stripUndefined({
      siteDescription:
        existing.siteDescription ??
        existing.tagline ??
        "Your next step, engineered.",
      faviconUrl: existing.faviconUrl ?? "",
      defaultMetaTitle:
        existing.defaultMetaTitle ??
        (existing.siteName && existing.tagline
          ? `${existing.siteName} — ${existing.tagline}`
          : existing.siteName),
      defaultMetaDescription:
        existing.defaultMetaDescription ??
        existing.siteDescription ??
        existing.tagline,
      adminPageLabels: {
        ...adminPageLabels,
        settings: settingsLabels,
        content: contentLabels,
      },
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );
  console.log("patched site_settings branding/SEO + page labels");

  const pagesSnap = await db.collection("cms_pages").get();
  let migrated = 0;
  for (const doc of pagesSnap.docs) {
    const data = doc.data();
    const patch: Record<string, unknown> = {};
    if (data.showInHeader == null && data.showInNav != null) {
      patch.showInHeader = Boolean(data.showInNav);
    }
    if (data.footerGroup == null) {
      patch.footerGroup = "none";
    }
    if (Object.keys(patch).length) {
      await doc.ref.set(
        stripUndefined({
          ...patch,
          updatedAt: FieldValue.serverTimestamp(),
        }),
        { merge: true },
      );
      migrated += 1;
    }
  }
  console.log(`migrated ${migrated} cms_pages placement fields`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
