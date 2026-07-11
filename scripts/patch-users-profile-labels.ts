/**
 * Patch admin users profile + account upload labels into live Firestore.
 * Run: npx tsx scripts/patch-users-profile-labels.ts
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
  const ref = db.collection("site_settings").doc("default");
  const snap = await ref.get();
  const existing = snap.data() ?? {};
  const adminPageLabels = {
    ...((existing.adminPageLabels as Record<string, unknown>) || {}),
  };

  adminPageLabels.users = {
    ...((adminPageLabels.users as Record<string, string>) || {}),
    title: "Team & users",
    eyebrow: "Admin · Users",
    subtitle: "Every account on the platform — admins, employers, and students.",
    search: "Search",
    empty: "No users yet",
    email: "Email",
    name: "Name",
    role: "Role",
    status: "Status",
    actions: "Actions",
    promoteAdmin: "Make admin",
    suspend: "Suspend",
    activate: "Activate",
    viewProfile: "View",
    profileTitle: "User profile",
    openInCrm: "Open in CRM",
    profileLoadError: "Could not load profile.",
    noLinkedProfile: "No linked profile yet.",
    close: "Close",
    loading: "Loading…",
    phone: "Phone",
    fullName: "Full name",
    university: "University",
    currentCity: "City",
    sector: "Sector",
    seniority: "Seniority",
    availability: "Availability",
    skills: "Skills",
    companyName: "Company",
    contactName: "Contact",
    industry: "Industry",
    city: "City",
    website: "Website",
  };

  adminPageLabels.account = {
    ...((adminPageLabels.account as Record<string, string>) || {}),
    uploadPhoto: "Upload photo",
    photoDropzone: "JPG or PNG. Click or drop to upload.",
    uploadProgress: "Uploading…",
    uploadError: "Upload failed. Try a smaller JPG or PNG.",
    photoReady: "Photo ready — click Save changes.",
    photoSaved: "Photo saved.",
    storage_not_configured: "Storage is not configured.",
    upload_failed: "Upload failed. Try a smaller JPG or PNG.",
    removePhoto: "Remove",
  };

  await ref.set(
    stripUndefined({
      adminPageLabels,
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );

  console.log("Patched adminPageLabels.users + adminPageLabels.account");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
