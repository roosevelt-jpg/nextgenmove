import { Resend } from "resend";
import {
  getIntegrationSecrets,
  isIntegrationConnected,
} from "@/lib/admin/integration-secrets";
import { adminDb } from "@/lib/firebase-admin";

export const RESEND_INTEGRATION_ID = "resend";

export class ResendNotConfiguredError extends Error {
  constructor(message = "resend_not_configured") {
    super(message);
    this.name = "ResendNotConfiguredError";
  }
}

export async function isResendLive(): Promise<boolean> {
  if (!(await isIntegrationConnected(RESEND_INTEGRATION_ID))) {
    return false;
  }
  const secrets = await getIntegrationSecrets(RESEND_INTEGRATION_ID);
  const key = secrets.apiKey?.trim() ?? "";
  return key.startsWith("re_");
}

export async function getResendFrom(): Promise<{
  email: string;
  name: string;
}> {
  const snap = await adminDb.collection("integrations").doc(RESEND_INTEGRATION_ID).get();
  const config = (snap.data()?.config ?? {}) as Record<string, string>;
  const secrets = await getIntegrationSecrets(RESEND_INTEGRATION_ID);

  const email =
    config.fromEmail?.trim() ||
    secrets.fromEmail?.trim() ||
    "";
  const name = config.fromName?.trim() || "Venturo";

  if (!email || !email.includes("@")) {
    throw new ResendNotConfiguredError("resend_missing_from_email");
  }

  return { email, name };
}

export async function sendViaResend(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<void> {
  if (!(await isResendLive())) {
    throw new ResendNotConfiguredError();
  }

  const secrets = await getIntegrationSecrets(RESEND_INTEGRATION_ID);
  const apiKey = secrets.apiKey?.trim();
  if (!apiKey?.startsWith("re_")) {
    throw new ResendNotConfiguredError("resend_missing_api_key");
  }

  const from = await getResendFrom();
  const resend = new Resend(apiKey);

  const result = await resend.emails.send({
    from: `${from.name} <${from.email}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    replyTo: options.replyTo,
  });

  if (result.error) {
    throw new Error(`resend_send_failed:${result.error.message}`);
  }
}
