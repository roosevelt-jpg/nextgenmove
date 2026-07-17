/**
 * Patch homepage How-it-Works steps to the 4-step feedback sequence.
 * Run: npx tsx scripts/patch-home-steps.ts
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { stripUndefined } from "../src/lib/stripUndefined";

config({ path: resolve(process.cwd(), ".env.local") });

const STEPS = [
  {
    legNumber: 1,
    phaseLabel: "STEP 01",
    title: "Connect and build your profile",
    description:
      "Click the connect button to create your account and build your profile.",
  },
  {
    legNumber: 2,
    phaseLabel: "STEP 02",
    title: "Get background checked",
    description:
      "Complete verification so employers can trust your credentials.",
  },
  {
    legNumber: 3,
    phaseLabel: "STEP 03",
    title: "Publish your profile for employers",
    description:
      "Go live in the talent pool so vetted employers can find you.",
  },
  {
    legNumber: 4,
    phaseLabel: "STEP 04",
    title: "Follow up and start work",
    description:
      "Follow up with messages and start work immediately once placed.",
  },
];

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
  const homeRef = db.collection("page_home").doc("default");
  await homeRef.set(
    stripUndefined({
      steps: STEPS,
      itineraryEyebrow: "The itinerary",
      itineraryHeadline: "Four steps. One arrival.",
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );
  console.log("page_home/default → 4 how-it-works steps");

  const howRef = db.collection("page_how_it_works").doc("default");
  await howRef.set(
    stripUndefined({
      steps: STEPS,
      headline: "Four steps. One arrival.",
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );
  console.log("page_how_it_works/default → 4 steps");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
