/**
 * Create/update the super-admin Auth user + Firestore role.
 * Reads SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD from .env.local
 * Run: npx tsx scripts/upsert-admin.ts
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { stripUndefined } from "../src/lib/stripUndefined";

config({ path: resolve(process.cwd(), ".env.local") });

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

  const auth = getAuth();
  const db = getFirestore();

  let uid: string;
  try {
    const existing = await auth.getUserByEmail(email);
    uid = existing.uid;
    await auth.updateUser(uid, {
      password,
      emailVerified: true,
      disabled: false,
    });
    console.log(`updated password for ${email}`);
  } catch (error: unknown) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: string }).code)
        : "";
    if (code !== "auth/user-not-found") throw error;

    const created = await auth.createUser({
      email,
      password,
      emailVerified: true,
    });
    uid = created.uid;
    console.log(`created auth user ${email}`);
  }

  await db
    .collection("users")
    .doc(uid)
    .set(
      stripUndefined({
        uid,
        email,
        role: "admin",
        displayName: "Nextgenmove Admin",
        photoUrl: null,
        status: "active",
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      }),
      { merge: true },
    );
  console.log(`users/${uid} → role=admin`);

  // Disable the previous seed admin if it still exists
  const legacy = "admin@nextgenmove.local";
  if (email.toLowerCase() !== legacy) {
    try {
      const old = await auth.getUserByEmail(legacy);
      await auth.updateUser(old.uid, { disabled: true });
      await db.collection("users").doc(old.uid).set(
        stripUndefined({ status: "suspended", role: "admin" }),
        { merge: true },
      );
      console.log(`disabled legacy admin ${legacy}`);
    } catch {
      // no legacy user — fine
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
