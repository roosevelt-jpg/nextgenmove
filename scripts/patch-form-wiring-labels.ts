/**
 * Patch formLabels for newsletter CTA + CRM reply copy.
 * Run: npx tsx scripts/patch-form-wiring-labels.ts
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { stripUndefined } from "../src/lib/stripUndefined";

config({ path: resolve(process.cwd(), ".env.local") });

function initAdmin() {
  if (getApps().length) return;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase Admin env vars");
  }
  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

async function main() {
  initAdmin();
  const db = getFirestore();
  const ref = db.collection("site_settings").doc("default");
  const snap = await ref.get();
  const data = snap.data() ?? {};
  const formLabels = {
    ...((data.formLabels as Record<string, string>) || {}),
    newsletterSubmit: "Subscribe",
    subscribe: "Subscribe",
    newsletterTitle: "Get the next dispatch",
    newsletterSubtitle: "One email a month. No noise.",
  };
  const crm = {
    ...((data.adminPageLabels as Record<string, Record<string, string>>)
      ?.crm || {}),
    messageTitle: "Reply",
    messageSent: "Message sent.",
    channel_email: "Email",
    channel_sms: "SMS",
    channel_whatsapp: "WhatsApp",
  };

  await ref.set(
    stripUndefined({
      formLabels,
      adminPageLabels: {
        ...((data.adminPageLabels as Record<string, unknown>) || {}),
        crm,
      },
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );
  console.log("Patched formLabels + CRM reply labels");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
