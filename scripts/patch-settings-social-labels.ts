/**
 * Patch settings consolidation + social / contact labels.
 * Run: npx tsx scripts/patch-settings-social-labels.ts
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
    globalSettings: "My account",
    myAccount: "My account",
  };

  adminPageLabels.settings = {
    ...((adminPageLabels.settings as Record<string, string>) || {}),
    socialMediaTitle: "Social media",
    socialLinksHelp:
      "These links show as icons in the bottom-right of the site footer and on the contact page.",
    socialLinksEmpty: "No social links yet.",
    socialPlatform: "Platform",
    addSocialLink: "Add social link",
    saveSocialLinks: "Save social links",
    saving: "Saving…",
    footerCopyright: "Footer copyright",
    footerAttributionPrefix: "Footer attribution prefix",
    footerAttributionName: "Footer attribution name",
    footerAttributionUrl: "Footer attribution URL",
    siteDescription: "Footer / SEO description",
    tagline: "Tagline",
    platformLinkedin: "LinkedIn",
    platformInstagram: "Instagram",
    platformX: "X",
    platformFacebook: "Facebook",
    platformYoutube: "YouTube",
    platformTiktok: "TikTok",
    platformWhatsapp: "WhatsApp",
    platformGithub: "GitHub",
    platformOther: "Other",
  };

  const navLabels = {
    ...((existing.navLabels as Record<string, string>) || {}),
    contact: "Contact",
  };

  const pageLabels = {
    ...((existing.pageLabels as Record<string, string>) || {}),
    contactEyebrow: "Contact",
    contactTitle: "Get in touch.",
    contactSubtitle: "Reach the Nextgenmove team by email or on social.",
    contactEmailLabel: "Email",
    contactSocialTitle: "Social",
    contactMetaTitle: "Contact",
    contactMetaDescription: "Contact Nextgenmove by email or social media.",
  };

  const formLabels = {
    ...((existing.formLabels as Record<string, string>) || {}),
    platformLinkedin: "LinkedIn",
    platformInstagram: "Instagram",
    platformX: "X",
    platformFacebook: "Facebook",
    platformYoutube: "YouTube",
    platformTiktok: "TikTok",
    platformWhatsapp: "WhatsApp",
    platformGithub: "GitHub",
    platformOther: "Other",
    footerCopyright: "© {year} {siteName}",
    footerAttributionPrefix: "Made with ❤️ by",
    footerAttributionName: "FLYN.AI",
    footerAttributionUrl: "https://myflynai.com/",
  };

  const employerPageLabels = {
    ...((existing.employerPageLabels as Record<string, unknown>) || {}),
  };
  employerPageLabels.shell = {
    ...((employerPageLabels.shell as Record<string, string>) || {}),
    globalSettings: "Settings",
    settings: "Settings",
  };

  const studentPageLabels = {
    ...((existing.studentPageLabels as Record<string, unknown>) || {}),
  };
  studentPageLabels.shell = {
    ...((studentPageLabels.shell as Record<string, string>) || {}),
    globalSettings: "Settings",
    settings: "Settings",
  };

  await ref.set(
    stripUndefined({
      adminPageLabels,
      navLabels,
      pageLabels,
      formLabels,
      footerCopyright:
        (existing.footerCopyright as string | undefined) ||
        "© {year} {siteName}",
      footerAttributionPrefix:
        (existing.footerAttributionPrefix as string | undefined) ||
        "Made with ❤️ by",
      footerAttributionName:
        (existing.footerAttributionName as string | undefined) || "FLYN.AI",
      footerAttributionUrl:
        (existing.footerAttributionUrl as string | undefined) ||
        "https://myflynai.com/",
      employerPageLabels,
      studentPageLabels,
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );

  console.log("Patched settings / social / contact / footer attribution labels");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
