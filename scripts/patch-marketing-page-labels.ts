/**
 * Ensure marketing pageLabels exist for tracks/pricing/how-it-works headers.
 * Run: npx tsx scripts/patch-marketing-page-labels.ts
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
  const ref = db.collection("site_settings").doc("default");
  const snap = await ref.get();
  const existing = snap.data() || {};
  const pageLabels = {
    ...((existing.pageLabels as Record<string, string>) || {}),
  };

  const defaults: Record<string, string> = {
    tracksEyebrow: "Track A / Track B",
    tracksHeadline: "Which track fits how you hire?",
    tracksIntro:
      "A side-by-side of what each track actually does for your team.",
    tracksCtaLabel: "Request talent",
    tracksCtaBody: "Tell us who you need — we’ll match the right track.",
    comparisonTitle: "Compare tracks",
    comparisonFeatureColumn: "Feature",
    comparisonTrackAColumn: "Track A · Self service",
    comparisonTrackBColumn: "Track B · Full service",
    howItWorksEyebrow: "How it works",
    howItWorksHeadline: "Three legs. One arrival.",
    howItWorksCtaLabel: "Start your journey",
    howItWorksCtaHref: "/sign-up",
    howItWorksCtaBody: "Free to join. Earn your first 2,000 credits on welcome.",
    pricingEyebrow: "Pricing",
    pricingHeadline: "Two tracks. Pick your altitude.",
    trackATitle: "Track A",
    trackBTitle: "Track B",
    trackACtaLabel: "Start Track A",
    trackBCtaLabel: "Start Track B",
    faqTitle: "Questions",
  };

  for (const [key, value] of Object.entries(defaults)) {
    if (!pageLabels[key]?.trim()) pageLabels[key] = value;
  }

  await ref.set(
    stripUndefined({
      pageLabels,
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );
  console.log("patched marketing pageLabels");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
