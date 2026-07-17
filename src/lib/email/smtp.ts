import nodemailer from "nodemailer";
import {
  getIntegrationSecrets,
  isIntegrationConnected,
} from "@/lib/admin/integration-secrets";
import { adminDb } from "@/lib/firebase-admin";

export const GMAIL_SMTP_INTEGRATION_ID = "gmail_smtp";

export class SmtpNotConfiguredError extends Error {
  constructor(message = "smtp_not_configured") {
    super(message);
    this.name = "SmtpNotConfiguredError";
  }
}

export async function isSmtpLive(): Promise<boolean> {
  if (!(await isIntegrationConnected(GMAIL_SMTP_INTEGRATION_ID))) {
    return false;
  }
  const secrets = await getIntegrationSecrets(GMAIL_SMTP_INTEGRATION_ID);
  return Boolean(
    secrets.user?.includes("@") &&
      secrets.pass &&
      (secrets.host || "smtp.gmail.com"),
  );
}

async function resolveSmtpConfig() {
  const secrets = await getIntegrationSecrets(GMAIL_SMTP_INTEGRATION_ID);
  let config: Record<string, string> = {};
  try {
    const snap = await adminDb
      .collection("integrations")
      .doc(GMAIL_SMTP_INTEGRATION_ID)
      .get();
    config = (snap.data()?.config ?? {}) as Record<string, string>;
  } catch {
    // Config may be unavailable during Firestore outages.
  }

  const host =
    config.host?.trim() ||
    secrets.host?.trim() ||
    process.env.SMTP_HOST?.trim() ||
    "smtp.gmail.com";
  const port = Number(
    config.port?.trim() ||
      secrets.port?.trim() ||
      process.env.SMTP_PORT?.trim() ||
      "465",
  );
  const user =
    secrets.user?.trim() || process.env.SMTP_USER?.trim() || "";
  const pass =
    secrets.pass?.trim() || process.env.SMTP_PASS?.trim() || "";
  const fromEmail =
    config.fromEmail?.trim() ||
    secrets.fromEmail?.trim() ||
    process.env.SMTP_FROM_EMAIL?.trim() ||
    user;
  const fromName =
    config.fromName?.trim() ||
    secrets.fromName?.trim() ||
    process.env.SMTP_FROM_NAME?.trim() ||
    "Nextgenmove";
  const secureRaw =
    config.secure?.trim() ||
    secrets.secure?.trim() ||
    process.env.SMTP_SECURE?.trim() ||
    "";
  const secure =
    secureRaw === "false" || secureRaw === "0" ? false : port === 465;

  if (!user || !pass || !fromEmail.includes("@")) {
    throw new SmtpNotConfiguredError();
  }

  return { host, port, user, pass, fromEmail, fromName, secure };
}

export async function sendViaSmtp(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<void> {
  if (!(await isSmtpLive())) {
    throw new SmtpNotConfiguredError();
  }

  const cfg = await resolveSmtpConfig();
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
  });

  await transporter.sendMail({
    from: `${cfg.fromName} <${cfg.fromEmail}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    replyTo: options.replyTo,
  });
}
