/**
 * One-shot brand rename: NextGen Move / agency Lemoni copy → Venturo
 * in site_settings and common CMS page docs.
 *
 * Usage: npx tsx scripts/rename-brand-venturo.ts
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
    .replace(/NextGen\s*Move/gi, "Venturo")
    .replace(/NextGenMove/gi, "Venturo")
    .replace(/nextgenmove\.agency/gi, "venturo.ae")
    .replace(/Introduction via Lemoni/g, "Introduction via Venturo")
    .replace(/Lemoni does everything/g, "Venturo does everything")
    .replace(/Lemoni searches for you/g, "Venturo searches for you")
    .replace(/Lemoni handles the introduction/g, "Venturo handles the introduction")
    .replace(/Lemoni actively sources/g, "Venturo actively sources")
    .replace(/Lemoni-led/g, "Venturo-led")
    .replace(/Ask Lemoni/g, "Ask Venturo")
    .replace(/else Lemoni should/g, "else Venturo should")
    .replace(/otherwise Lemoni confirms/g, "otherwise Venturo confirms")
    .replace(/coached by Lemoni/g, "coached by Venturo")
    .replace(/let Lemoni source/g, "let Venturo source")
    .replace(/Meet your coach: Lemoni/g, "Meet your coach")
    .replace(/PLACED VIA NEXTGEN MOVE/gi, "PLACED VIA VENTURO")
    .replace(/placed via NextGen Move/gi, "placed via Venturo");
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

  const targets: Array<{ collection: string; id: string }> = [
    { collection: "site_settings", id: "default" },
    { collection: "pages", id: "home" },
    { collection: "pages", id: "about" },
    { collection: "pages", id: "pricing" },
    { collection: "pages", id: "tracks" },
    { collection: "pages", id: "how_it_works" },
    { collection: "pages", id: "request_talent" },
  ];

  for (const target of targets) {
    const ref = db.collection(target.collection).doc(target.id);
    const snap = await ref.get();
    if (!snap.exists) {
      console.log(`  skip ${target.collection}/${target.id} (missing)`);
      continue;
    }
    const { next, changed } = renameDeep(snap.data());
    if (!changed) {
      console.log(`  ok   ${target.collection}/${target.id} (already Venturo)`);
      continue;
    }
    await ref.set(next as Record<string, unknown>, { merge: true });
    console.log(`  fixed ${target.collection}/${target.id}`);
  }

  console.log("\nBrand rename complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
