import {
  getIntegrationSecrets,
  isIntegrationConnected,
} from "@/lib/admin/integration-secrets";
import { adminDb } from "@/lib/firebase-admin";

const TWILIO_INTEGRATION_ID = "twilio";

export class TwilioNotConfiguredError extends Error {
  constructor(message = "twilio_not_configured") {
    super(message);
    this.name = "TwilioNotConfiguredError";
  }
}

export async function isTwilioLive(): Promise<boolean> {
  if (!(await isIntegrationConnected(TWILIO_INTEGRATION_ID))) {
    return false;
  }
  const secrets = await getIntegrationSecrets(TWILIO_INTEGRATION_ID);
  return Boolean(secrets.accountSid && secrets.authToken);
}

async function getTwilioConfig(): Promise<{
  accountSid: string;
  authToken: string;
  fromSms: string;
  fromWhatsApp: string;
}> {
  if (!(await isTwilioLive())) {
    throw new TwilioNotConfiguredError();
  }

  const secrets = await getIntegrationSecrets(TWILIO_INTEGRATION_ID);
  const snap = await adminDb
    .collection("integrations")
    .doc(TWILIO_INTEGRATION_ID)
    .get();
  const config = (snap.data()?.config ?? {}) as Record<string, string>;

  const accountSid = String(secrets.accountSid ?? "").trim();
  const authToken = String(secrets.authToken ?? "").trim();
  const fromSms = String(config.fromSms ?? secrets.fromSms ?? "").trim();
  const fromWhatsApp = String(
    config.fromWhatsApp ?? secrets.fromWhatsApp ?? "",
  ).trim();

  if (!accountSid || !authToken) {
    throw new TwilioNotConfiguredError("twilio_missing_credentials");
  }

  return { accountSid, authToken, fromSms, fromWhatsApp };
}

async function twilioCreateMessage(options: {
  to: string;
  from: string;
  body: string;
}): Promise<{ sid: string }> {
  const { accountSid, authToken } = await getTwilioConfig();
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const params = new URLSearchParams({
    To: options.to,
    From: options.from,
    Body: options.body,
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`twilio_send_failed:${response.status}:${text.slice(0, 200)}`);
  }

  const payload = (await response.json()) as { sid?: string };
  return { sid: String(payload.sid ?? "") };
}

export async function sendSms(options: {
  to: string;
  body: string;
}): Promise<{ sid: string }> {
  const { fromSms } = await getTwilioConfig();
  if (!fromSms) {
    throw new TwilioNotConfiguredError("twilio_missing_from_sms");
  }
  return twilioCreateMessage({
    to: options.to,
    from: fromSms,
    body: options.body,
  });
}

export async function sendWhatsApp(options: {
  to: string;
  body: string;
}): Promise<{ sid: string }> {
  const { fromWhatsApp } = await getTwilioConfig();
  if (!fromWhatsApp) {
    throw new TwilioNotConfiguredError("twilio_missing_from_whatsapp");
  }
  const to = options.to.startsWith("whatsapp:")
    ? options.to
    : `whatsapp:${options.to}`;
  const from = fromWhatsApp.startsWith("whatsapp:")
    ? fromWhatsApp
    : `whatsapp:${fromWhatsApp}`;
  return twilioCreateMessage({
    to,
    from,
    body: options.body,
  });
}

export { TWILIO_INTEGRATION_ID };
