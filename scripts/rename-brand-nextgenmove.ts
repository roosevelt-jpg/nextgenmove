/**
 * One-shot brand rename: Venturo / Lemoni → Nextgenmove
 * in site_settings and common CMS page docs.
 *
 * Usage: npx tsx scripts/rename-brand-nextgenmove.ts
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
loadEnv({ path: resolve(process.cwd(), ".env.local") });

import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function initAdmin(): App {
  if (getApps().length) return getApps()[0]!;
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n",
  );
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase Admin env vars");
  }
  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

function renameBrandString(value: string): string {
  return value
    .replace(/Lemoni Grootkerk/g, "Nextgenmove")
    .replace(/Lemoni Retail Co\.?/g, "Nextgenmove Retail Co.")
    .replace(/Introduction via Lemoni/g, "Introduction via Nextgenmove")
    .replace(/Lemoni does everything/g, "Nextgenmove does everything")
    .replace(/Lemoni searches for you/g, "Nextgenmove searches for you")
    .replace(/Lemoni handles the introduction/g, "Nextgenmove handles the introduction")
    .replace(/Lemoni actively sources/g, "Nextgenmove actively sources")
    .replace(/Lemoni-led/g, "Nextgenmove-led")
    .replace(/Ask Lemoni/g, "Ask Nextgenmove")
    .replace(/else Lemoni should/g, "else Nextgenmove should")
    .replace(/otherwise Lemoni confirms/g, "otherwise Nextgenmove confirms")
    .replace(/coached by Lemoni/g, "coached by Nextgenmove")
    .replace(/let Lemoni source/g, "let Nextgenmove source")
    .replace(/Meet your coach: Lemoni/g, "Meet your coach")
    .replace(/with Lemoni/g, "with Nextgenmove")
    .replace(/Lemoni/g, "Nextgenmove")
    .replace(/lemoni/g, "nextgenmove")
    .replace(/Venturo/g, "Nextgenmove")
    .replace(/VENTURO/g, "NEXTGENMOVE")
    .replace(/venturo\.ae/gi, "nextgenmove.ae")
    .replace(/venturo/g, "nextgenmove")
    .replace(/PLACED VIA VENTURO/gi, "PLACED VIA NEXTGENMOVE")
    .replace(/placed via Venturo/gi, "placed via Nextgenmove");
}

function renameDeep(value: unknown): { next: unknown; changed: boolean } {
  if (typeof value === "string") {
    const next = renameBrandString(value);
    return { next, changed: next !== value };
  }
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      const result = renameDeep(item);
      if (result.changed) changed = true;
      return result.next;
    });
    return { next, changed };
  }
  if (value && typeof value === "object") {
    let changed = false;
    const next: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      const result = renameDeep(child);
      next[key] = result.next;
      if (result.changed) changed = true;
    }
    return { next, changed };
  }
  return { next: value, changed: false };
}

async function main() {
  initAdmin();
  const db = getFirestore();

  const singletonTargets: Array<{ collection: string; id: string }> = [
    { collection: "site_settings", id: "default" },
    { collection: "page_home", id: "default" },
    { collection: "page_about", id: "default" },
    { collection: "page_pricing", id: "default" },
    { collection: "page_tracks", id: "default" },
    { collection: "page_how_it_works", id: "default" },
  ];

  for (const target of singletonTargets) {
    const ref = db.collection(target.collection).doc(target.id);
    const snap = await ref.get();
    if (!snap.exists) {
      console.log(`  skip ${target.collection}/${target.id} (missing)`);
      continue;
    }
    const { next, changed } = renameDeep(snap.data());
    if (!changed) {
      console.log(`  ok   ${target.collection}/${target.id} (already Nextgenmove)`);
      continue;
    }
    await ref.set(next as Record<string, unknown>, { merge: true });
    console.log(`  fixed ${target.collection}/${target.id}`);
  }

  // Also scan email templates
  const templates = await db.collection("email_templates").get();
  for (const doc of templates.docs) {
    const { next, changed } = renameDeep(doc.data());
    if (!changed) continue;
    await doc.ref.set(next as Record<string, unknown>, { merge: true });
    console.log(`  fixed email_templates/${doc.id}`);
  }

  console.log("\nBrand rename complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
