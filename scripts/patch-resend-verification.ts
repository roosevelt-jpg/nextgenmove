/**
 * Seed Resend integration + email_otp template; upsert auth verify labels.
 * Run: npx tsx scripts/patch-resend-verification.ts
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { stripUndefined } from "../src/lib/stripUndefined";
import { EMAIL_TEMPLATES } from "./email-templates";

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

  const resendRef = db.collection("integrations").doc("resend");
  const existing = (await resendRef.get()).data() ?? {};
  const alreadyConnected = existing.status === "connected";
  await resendRef.set(
    stripUndefined({
      id: "resend",
      name: existing.name || "Resend",
      category: existing.category || "Transactional email",
      description:
        existing.description ||
        "All notification emails — paste re_ API key + verified from address to go live.",
      iconUrl: existing.iconUrl || "",
      // Never clobber a live connection when re-running this patch.
      ...(alreadyConnected
        ? {}
        : { status: "not_connected", connectedAt: null }),
      config: {
        category: "Transactional email",
        ...(typeof existing.config === "object" && existing.config
          ? existing.config
          : {}),
      },
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );
  console.log(
    alreadyConnected
      ? "upserted integrations/resend (kept connected)"
      : "upserted integrations/resend",
  );

  const otpTpl = EMAIL_TEMPLATES.find((t) => t.id === "email_otp");
  if (otpTpl) {
    await db
      .collection("email_templates")
      .doc("email_otp")
      .set(stripUndefined({ ...otpTpl }), { merge: true });
    console.log("upserted email_templates/email_otp");
  }

  const settingsRef = db.collection("site_settings").doc("default");
  const snap = await settingsRef.get();
  const existing = (snap.data()?.authLabels ?? {}) as Record<string, string>;
  await settingsRef.set(
    stripUndefined({
      authLabels: {
        ...existing,
        stepVerify: existing.stepVerify || "3 · Verify email & phone",
        stepMedia: "4 · Photo / logo",
        verifyTitle: existing.verifyTitle || "Verify your email and phone",
        verifySubtitle:
          existing.verifySubtitle ||
          "We sent a code to your email. Then confirm your phone with the Firebase SMS code.",
        verifyEmailHeading: existing.verifyEmailHeading || "Email verification",
        verifyPhoneHeading: existing.verifyPhoneHeading || "Phone verification",
        emailOtpLabel: existing.emailOtpLabel || "Email code",
        smsOtpLabel: existing.smsOtpLabel || "SMS code",
        resendEmailOtpLabel: existing.resendEmailOtpLabel || "Resend email code",
        sendSmsOtpLabel: existing.sendSmsOtpLabel || "Send SMS code",
        verifyEmailButton: existing.verifyEmailButton || "Verify email",
        verifyPhoneButton: existing.verifyPhoneButton || "Verify phone",
        continueAfterVerifyLabel:
          existing.continueAfterVerifyLabel || "Continue to profile media",
        verifiedLabel: existing.verifiedLabel || "Verified",
        verification_required:
          existing.verification_required ||
          "Verify your email and phone to continue.",
      },
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );
  console.log("patched site_settings authLabels for verification");
  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
