/**
 * Create/update the super-admin Auth user + Firestore role.
 * Reads SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD from .env.local
 * Preferentially migrates an existing admin account to info@nextgenmove.agency.
 * Run: npx tsx scripts/upsert-admin.ts
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { stripUndefined } from "../src/lib/stripUndefined";

config({ path: resolve(process.cwd(), ".env.local") });

const PRIMARY_ADMIN_EMAIL = "info@nextgenmove.agency";
const LEGACY_EMAILS = [
  "admin@nextgenmove.agency",
  "admin@venturo.ae",
  "admin@nextgenmove.local",
];

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

/** Move an existing admin Auth user to PRIMARY_ADMIN_EMAIL when possible. */
async function migrateExistingAdminEmail(password: string): Promise<boolean> {
  const auth = getAuth();
  const db = getFirestore();
  const target = PRIMARY_ADMIN_EMAIL;

  try {
    await auth.getUserByEmail(target);
    console.log(`${target} already exists — will upsert credentials`);
    return false;
  } catch (error: unknown) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: string }).code)
        : "";
    if (code !== "auth/user-not-found") throw error;
  }

  const seed = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const candidates = [
    ...(seed && seed !== target ? [seed] : []),
    ...LEGACY_EMAILS.filter((e) => e !== target && e !== seed),
  ];

  for (const fromEmail of candidates) {
    try {
      const existing = await auth.getUserByEmail(fromEmail);
      await auth.updateUser(existing.uid, {
        email: target,
        password,
        emailVerified: true,
        disabled: false,
      });
      await auth.setCustomUserClaims(existing.uid, { role: "admin" });
      await db
        .collection("users")
        .doc(existing.uid)
        .set(
          stripUndefined({
            uid: existing.uid,
            email: target,
            role: "admin",
            displayName: "Nextgenmove Admin",
            status: "active",
            updatedAt: FieldValue.serverTimestamp(),
          }),
          { merge: true },
        );
      console.log(`migrated ${fromEmail} → ${target} (uid=${existing.uid})`);
      return true;
    } catch (error: unknown) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String((error as { code: string }).code)
          : "";
      if (code === "auth/user-not-found") continue;
      throw error;
    }
  }

  return false;
}

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL?.trim() || PRIMARY_ADMIN_EMAIL).toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!password) {
    throw new Error("SEED_ADMIN_PASSWORD must be set");
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

  const migrated = await migrateExistingAdminEmail(password);
  if (!migrated) {
    await upsertAdminUser({
      email: PRIMARY_ADMIN_EMAIL,
      password,
      displayName: "Nextgenmove Admin",
      keepActive: true,
    });
  }

  // Keep seed email in sync if it differs (e.g. still pointing at an old alias)
  if (email !== PRIMARY_ADMIN_EMAIL) {
    console.log(
      `Note: SEED_ADMIN_EMAIL is ${email}; primary login is ${PRIMARY_ADMIN_EMAIL}`,
    );
  }

  // Disable only the old .local seed account
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

  console.log("\nLogin with:");
  console.log(`  ${PRIMARY_ADMIN_EMAIL}`);
  console.log("  (password from SEED_ADMIN_PASSWORD)");
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
