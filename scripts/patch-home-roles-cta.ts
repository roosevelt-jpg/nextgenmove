/**
 * Patch homepage third CTA (roles) + admin label.
 * Run: npx tsx scripts/patch-home-roles-cta.ts
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
    .collection("page_home")
    .doc("default")
    .set(
      stripUndefined({
        rolesCta: {
          eyebrow: "Open seats",
          title: "Roles, ready now.",
          body: "Browse live openings across corridors — visa-ready paths included.",
          ctaLabel: "Browse roles",
          ctaHref: "/careers-talent",
        },
        updatedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true },
    );
  console.log("patched page_home.rolesCta");

  const settingsRef = db.collection("site_settings").doc("default");
  const snap = await settingsRef.get();
  const existing = snap.data() || {};
  const content = {
    ...((existing.adminPageLabels as Record<string, Record<string, string>>)?.content ??
      {}),
    rolesCta: "Roles CTA (third card)",
    talentCta: "Talent CTA",
    companyCta: "Company CTA",
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
  console.log("patched admin labels for rolesCta");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
