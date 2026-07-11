/**
 * Patch homepage corridor chips ticker settings + admin labels.
 * Run: npx tsx scripts/patch-corridor-chips-ticker.ts
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

  const homeRef = db.collection("page_home").doc("default");
  const homeSnap = await homeRef.get();
  const home = homeSnap.data() ?? {};

  await homeRef.set(
    stripUndefined({
      corridorChipsMarquee: {
        enabled: true,
        speedSec: 24,
        direction: "ltr",
        easing: "linear",
        pauseOnHover: true,
        ...((home.corridorChipsMarquee as object) || {}),
      },
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );

  const settingsRef = db.collection("site_settings").doc("default");
  const settingsSnap = await settingsRef.get();
  const existing = settingsSnap.data() ?? {};
  const adminPageLabels = {
    ...((existing.adminPageLabels as Record<string, unknown>) || {}),
  };
  adminPageLabels.content = {
    ...((adminPageLabels.content as Record<string, string>) || {}),
    corridorChips: "Corridor route chips",
    chip: "Route (e.g. AMS → DXB)",
    corridorChipsMarquee: "Corridor chips ticker",
    marqueeEnabled: "Animate ticker",
    marqueeSpeedSec: "Loop duration (seconds — lower is faster)",
    marqueeDirection: "Direction",
    marqueeEasing: "Transition / easing",
    marqueePauseOnHover: "Pause on hover",
  };

  await settingsRef.set(
    stripUndefined({
      adminPageLabels,
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );

  console.log("Patched corridor chips ticker + admin labels");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
