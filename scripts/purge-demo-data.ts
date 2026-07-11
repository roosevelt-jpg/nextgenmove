/**
 * Remove demo CRM / Auth data created by `npm run seed:demo`.
 * Keeps the super-admin and operational seed (taxonomies, CMS shells, levers).
 *
 * Run: npx tsx scripts/purge-demo-data.ts
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

loadEnv({ path: resolve(process.cwd(), ".env.local") });

const DEMO_EMAIL_SUFFIX = "@nextgenmove.demo";
const DEMO_DOC_PREFIX = "demo_";

function init() {
  if (getApps().length) return;
  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.FIREBASE_PROJECT_ID;
  const clientEmail =
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL ?? process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (
    process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? process.env.FIREBASE_PRIVATE_KEY
  )?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase Admin credentials in .env.local");
  }
  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

function isDemoEmail(value: unknown): boolean {
  const email = String(value ?? "")
    .trim()
    .toLowerCase();
  return email.endsWith(DEMO_EMAIL_SUFFIX);
}

async function deleteQueryBatch(
  db: Firestore,
  collection: string,
  predicate: (id: string, data: FirebaseFirestore.DocumentData) => boolean,
): Promise<number> {
  const snap = await db.collection(collection).get();
  let deleted = 0;
  const batchSize = 400;
  let batch = db.batch();
  let ops = 0;

  const commit = async () => {
    if (ops === 0) return;
    await batch.commit();
    batch = db.batch();
    ops = 0;
  };

  for (const doc of snap.docs) {
    if (!predicate(doc.id, doc.data())) continue;
    batch.delete(doc.ref);
    ops += 1;
    deleted += 1;
    if (ops >= batchSize) await commit();
  }
  await commit();
  return deleted;
}

async function main() {
  init();
  const auth = getAuth();
  const db = getFirestore();
  const summary: Record<string, number> = {};

  // 1) Auth users with @nextgenmove.demo
  let authDeleted = 0;
  let pageToken: string | undefined;
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const user of page.users) {
      if (!isDemoEmail(user.email)) continue;
      await auth.deleteUser(user.uid);
      authDeleted += 1;
    }
    pageToken = page.pageToken;
  } while (pageToken);
  summary.authUsers = authDeleted;

  // 2) Firestore collections — demo emails / demo_ ids / known demo content
  const collections: Array<{
    name: string;
    predicate: (id: string, data: FirebaseFirestore.DocumentData) => boolean;
  }> = [
    {
      name: "users",
      predicate: (_id, data) => isDemoEmail(data.email),
    },
    {
      name: "students",
      predicate: (_id, data) =>
        isDemoEmail(data.email) ||
        String(data.bio ?? "").includes("Demo candidate") ||
        String(data.importSource ?? "") === "seed_demo",
    },
    {
      name: "companies",
      predicate: (_id, data) =>
        isDemoEmail(data.contactEmail) || isDemoEmail(data.email),
    },
    {
      name: "matches",
      predicate: (id) => id.startsWith(DEMO_DOC_PREFIX),
    },
    {
      name: "content_items",
      predicate: (id) => id.startsWith(DEMO_DOC_PREFIX),
    },
    {
      name: "video_cards",
      predicate: (id) => id.startsWith(DEMO_DOC_PREFIX),
    },
    {
      name: "podcast_episodes",
      predicate: (id) => id.startsWith(DEMO_DOC_PREFIX),
    },
    {
      name: "articles",
      predicate: (id) => id.startsWith(DEMO_DOC_PREFIX),
    },
    {
      name: "job_postings",
      predicate: (id) => id.startsWith(DEMO_DOC_PREFIX),
    },
    {
      name: "public_roles",
      predicate: (id) => id.startsWith(DEMO_DOC_PREFIX),
    },
    {
      name: "requests",
      predicate: (id, data) =>
        id.startsWith(DEMO_DOC_PREFIX) || isDemoEmail(data.contactEmail),
    },
    {
      name: "job_applications",
      predicate: (id) => id.startsWith(DEMO_DOC_PREFIX),
    },
    {
      name: "role_interest_submissions",
      predicate: (id) => id.startsWith(DEMO_DOC_PREFIX),
    },
    {
      name: "activity_log",
      predicate: (id) => id.startsWith(DEMO_DOC_PREFIX),
    },
    {
      name: "newsletter_subscribers",
      predicate: (_id, data) => isDemoEmail(data.email),
    },
  ];

  for (const { name, predicate } of collections) {
    summary[name] = await deleteQueryBatch(db, name, predicate);
  }

  // 3) Orphan students/companies whose userId pointed at deleted demo Auth
  //    (already covered by email match in most cases)

  console.log("Purged demo data:");
  for (const [key, count] of Object.entries(summary)) {
    if (count > 0) console.log(`  ${key}: ${count}`);
  }
  console.log("Done. Re-run `npm run seed` for operational config if needed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
