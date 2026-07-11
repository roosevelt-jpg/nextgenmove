/**
 * Probe Resend connection + email_templates coverage (no send by default).
 * Optional: SEND_PROBE=1 PROBE_TO=you@email.com npx tsx scripts/probe-resend.ts
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { isResendLive, sendViaResend } from "../src/lib/email/resend";
import { EMAIL_TEMPLATES } from "./email-templates";

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
  const shell = (await db.collection("integrations").doc("resend").get()).data();
  const live = await isResendLive();

  console.log("--- Resend status ---");
  console.log("shell.status:", shell?.status ?? "(missing)");
  console.log("shell.fromEmail:", shell?.config?.fromEmail ?? "(none)");
  console.log("isResendLive:", live);

  const expected = EMAIL_TEMPLATES.map((t) => t.id);
  const snaps = await Promise.all(
    expected.map((id) => db.collection("email_templates").doc(id).get()),
  );
  const missing = expected.filter((id, i) => !snaps[i]?.exists);
  const present = expected.length - missing.length;

  console.log("--- Templates ---");
  console.log(`present: ${present}/${expected.length}`);
  if (missing.length) console.log("missing:", missing.join(", "));

  const notifyIds = [
    "account_created",
    "welcome",
    "email_otp",
    "email_verification",
    "account_login",
    "suspicious_login",
    "password_reset",
    "password_changed",
    "welcome_credits",
    "low_credit_balance",
    "topup_requested",
    "topup_successful",
    "referral_bonus",
    "plan_request_received",
    "plan_activated",
    "payment_failed",
    "match_update",
    "form_submission_ack",
    "admin_pending_alert",
  ];
  console.log("--- Notify templates wired ---");
  console.log(notifyIds.join(", "));

  if (process.env.SEND_PROBE === "1") {
    const to = process.env.PROBE_TO?.trim();
    if (!to) {
      throw new Error("Set PROBE_TO=email@domain.com when SEND_PROBE=1");
    }
    if (!live) {
      throw new Error("Resend is not live — cannot send probe");
    }
    await sendViaResend({
      to,
      subject: "Venturo Resend probe",
      html: "<p>Realtime Resend probe from Venturo. If you received this, delivery works.</p>",
      text: "Realtime Resend probe from Venturo. If you received this, delivery works.",
    });
    console.log("--- Probe sent ---");
    console.log("ok: true");
  } else {
    console.log("(Set SEND_PROBE=1 PROBE_TO=you@email.com to send a live probe.)");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
