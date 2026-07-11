/**
 * Patch tracks page stats + marketing CTA labels.
 * Run: npx tsx scripts/patch-tracks-styling.ts
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

  await db
    .collection("page_tracks")
    .doc("default")
    .set(
      stripUndefined({
        statBlocks: [
          {
            label: "Active talent",
            value: "0",
            metric: "active_students",
            suffix: "+",
          },
          {
            label: "Hiring partners",
            value: "0",
            metric: "active_companies",
            suffix: "+",
          },
          {
            label: "Placed this year",
            value: "0",
            metric: "placed_this_year",
          },
          {
            label: "Avg. time to place",
            value: "—",
            metric: "avg_time_to_place",
            suffix: "d",
          },
        ],
        ctaLabel: "Request talent",
        ctaHref: "/request-talent",
        updatedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true },
    );
  console.log("patched page_tracks stats + CTA");

  const settingsRef = db.collection("site_settings").doc("default");
  const snap = await settingsRef.get();
  const existing = snap.data() || {};
  const pageLabels = {
    ...((existing.pageLabels as Record<string, string>) || {}),
    howItWorksCtaLabel: "Start your journey",
    howItWorksCtaHref: "/sign-up",
    howItWorksCtaBody: "Free to join. Earn your first 2,000 credits on welcome.",
    tracksCtaLabel: "Request talent",
    tracksCtaBody: "Tell us who you need — we’ll match the right track.",
    trackACtaLabel: "Start Track A",
    trackBCtaLabel: "Start Track B",
  };

  await settingsRef.set(
    stripUndefined({
      pageLabels,
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );
  console.log("patched pageLabels CTAs");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
