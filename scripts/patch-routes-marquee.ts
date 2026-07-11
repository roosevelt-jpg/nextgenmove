/**
 * Patch homepage routes marquee CMS fields.
 * Run: npx tsx scripts/patch-routes-marquee.ts
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
  const homeRef = db.collection("page_home").doc("default");
  await homeRef.set(
    stripUndefined({
      currentRoutesLabel: "Current routes",
      currentRoutesItems: [
        { code: "AMS" },
        { code: "BER" },
        { code: "CAI" },
        { code: "WAW" },
        { code: "PAR" },
        { code: "LIS" },
        { code: "DXB" },
      ],
      routesMarquee: {
        enabled: true,
        speedSec: 28,
        direction: "ltr",
        easing: "linear",
        pauseOnHover: true,
        separator: " · ",
      },
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );
  console.log("patched page_home routes marquee");

  const settingsRef = db.collection("site_settings").doc("default");
  const snap = await settingsRef.get();
  const existing = snap.data() || {};
  const content = {
    ...((existing.adminPageLabels as Record<string, Record<string, string>>)?.content ??
      {}),
    currentRoutesLabel: "Routes bar label",
    currentRoutesItems: "Routes marquee items",
    routeCode: "Code (e.g. AMS)",
    routeLabel: "Optional label",
    routesMarquee: "Marquee behaviour",
    marqueeEnabled: "Animate marquee",
    marqueeSpeedSec: "Loop duration (seconds — lower is faster)",
    marqueeDirection: "Direction",
    marqueeEasing: "Transition / easing",
    marqueePauseOnHover: "Pause on hover",
    marqueeSeparator: "Separator between items",
    addRow: "Add route",
    removeRow: "Remove",
  };
  await settingsRef.set(
    stripUndefined({
      adminPageLabels: {
        ...((existing.adminPageLabels as object) || {}),
        content,
      },
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );
  console.log("patched admin labels for marquee");
  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
