/**
 * Create/update the super-admin Auth user + Firestore role.
 * Reads SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD from .env.local
 * Also ensures admin@nextgenmove.agency exists (domain migration alias).
 * Run: npx tsx scripts/upsert-admin.ts
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { stripUndefined } from "../src/lib/stripUndefined";

config({ path: resolve(process.cwd(), ".env.local") });

const DOMAIN_ALIAS_EMAIL = "admin@nextgenmove.agency";
const LEGACY_EMAILS = ["admin@nextgenmove.local", "admin@venturo.ae"];

async function upsertAdminUser(options: {
  email: string;
  password: string;
  displayName: string;
  keepActive: boolean;
}) {
  const auth = getAuth();
  const db = getFirestore();
  const email = options.email.trim().toLowerCase();

  let uid: string;
  try {
    const existing = await auth.getUserByEmail(email);
    uid = existing.uid;
    await auth.updateUser(uid, {
      password: options.password,
      emailVerified: true,
      disabled: !options.keepActive,
    });
    console.log(
      options.keepActive
        ? `updated password for ${email}`
        : `disabled ${email}`,
    );
  } catch (error: unknown) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: string }).code)
        : "";
    if (code !== "auth/user-not-found") throw error;
    if (!options.keepActive) {
      console.log(`skip missing ${email}`);
      return null;
    }

    const created = await auth.createUser({
      email,
      password: options.password,
      emailVerified: true,
    });
    uid = created.uid;
    console.log(`created auth user ${email}`);
  }

  await auth.setCustomUserClaims(uid, { role: "admin" });
  await db
    .collection("users")
    .doc(uid)
    .set(
      stripUndefined({
        uid,
        email,
        role: "admin",
        displayName: options.displayName,
        photoUrl: null,
        status: options.keepActive ? "active" : "suspended",
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      }),
      { merge: true },
    );
  console.log(`users/${uid} → role=admin status=${options.keepActive ? "active" : "suspended"}`);
  return uid;
}

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim();
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set");
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      }),
    });
  }

  const primary = email.toLowerCase();
  await upsertAdminUser({
    email: primary,
    password,
    displayName: "Nextgenmove Admin",
    keepActive: true,
  });

  // Always ensure the new domain admin works, even if SEED still uses venturo.ae
  if (primary !== DOMAIN_ALIAS_EMAIL) {
    await upsertAdminUser({
      email: DOMAIN_ALIAS_EMAIL,
      password,
      displayName: "Nextgenmove Admin",
      keepActive: true,
    });
  }

  for (const legacy of LEGACY_EMAILS) {
    if (legacy === primary || legacy === DOMAIN_ALIAS_EMAIL) continue;
    // Keep admin@venturo.ae active if it is the seed email; otherwise leave alone
    // (do not auto-disable venturo — operators may still use it during DNS cutover)
  }

  // Only disable the old .local seed account
  try {
    const auth = getAuth();
    const db = getFirestore();
    const old = await auth.getUserByEmail("admin@nextgenmove.local");
    await auth.updateUser(old.uid, { disabled: true });
    await db.collection("users").doc(old.uid).set(
      stripUndefined({ status: "suspended", role: "admin" }),
      { merge: true },
    );
    console.log("disabled legacy admin admin@nextgenmove.local");
  } catch {
    // fine
  }

  console.log("\nLogin with either:");
  console.log(`  ${primary}`);
  if (primary !== DOMAIN_ALIAS_EMAIL) console.log(`  ${DOMAIN_ALIAS_EMAIL}`);
  console.log("  (same password from SEED_ADMIN_PASSWORD)");
  console.log(
    "\nIf browser login fails on the new domain, add these to Firebase Console → Authentication → Settings → Authorized domains:",
  );
  console.log("  nextgenmove.agency");
  console.log("  www.nextgenmove.agency");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
