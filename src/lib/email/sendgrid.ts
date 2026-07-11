import sgMail from "@sendgrid/mail";
import {
  getIntegrationSecrets,
  isIntegrationConnected,
} from "@/lib/admin/integration-secrets";
import { adminDb } from "@/lib/firebase-admin";

const SENDGRID_INTEGRATION_ID = "sendgrid";

export class SendGridNotConfiguredError extends Error {
  constructor(message = "sendgrid_not_configured") {
    super(message);
    this.name = "SendGridNotConfiguredError";
  }
}

export async function isSendGridLive(): Promise<boolean> {
  if (!(await isIntegrationConnected(SENDGRID_INTEGRATION_ID))) {
    return false;
  }
  const secrets = await getIntegrationSecrets(SENDGRID_INTEGRATION_ID);
  return Boolean(secrets.apiKey?.startsWith("SG."));
}

export async function getSendGridFrom(): Promise<{
  email: string;
  name: string;
}> {
  const snap = await adminDb.collection("integrations").doc(SENDGRID_INTEGRATION_ID).get();
  const config = (snap.data()?.config ?? {}) as Record<string, string>;
  const secrets = await getIntegrationSecrets(SENDGRID_INTEGRATION_ID);

  const email =
    config.fromEmail?.trim() ||
    secrets.fromEmail?.trim() ||
    "";
  const name = config.fromName?.trim() || "Venturo";

  if (!email || !email.includes("@")) {
    throw new SendGridNotConfiguredError("sendgrid_missing_from_email");
  }

  return { email, name };
}

export async function sendViaSendGrid(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<void> {
  if (!(await isSendGridLive())) {
    throw new SendGridNotConfiguredError();
  }

  const secrets = await getIntegrationSecrets(SENDGRID_INTEGRATION_ID);
  const apiKey = secrets.apiKey?.trim();
  if (!apiKey?.startsWith("SG.")) {
    throw new SendGridNotConfiguredError("sendgrid_missing_api_key");
  }

  const from = await getSendGridFrom();
  sgMail.setApiKey(apiKey);

  await sgMail.send({
    to: options.to,
    from: { email: from.email, name: from.name },
    replyTo: options.replyTo,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
}

export { SENDGRID_INTEGRATION_ID };
