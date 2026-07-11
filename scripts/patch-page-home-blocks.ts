/**
 * Merge missing homepage blocks back onto page_home/default.
 * Run: npx tsx scripts/patch-page-home-blocks.ts
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { FALLBACK_PAGE_HOME } from "../src/lib/public/cms-fallbacks";
import { mergePageHome } from "../src/lib/public/merge-page-home";
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
  const ref = db.collection("page_home").doc("default");
  const snap = await ref.get();
  const existing = (snap.data() ?? {}) as Record<string, unknown>;
  const merged = mergePageHome(existing as never, FALLBACK_PAGE_HOME);

  await ref.set(
    stripUndefined({
      ...merged,
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );

  console.log("Patched page_home with stories/podcast/CTA/testimonial blocks");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
