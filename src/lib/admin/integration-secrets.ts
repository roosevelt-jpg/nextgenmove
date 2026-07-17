import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";

const ALGORITHM = "aes-256-gcm";

/** Env fallbacks when Firestore secrets are unavailable (quota / outage). */
const ENV_SECRET_FALLBACKS: Record<string, Record<string, () => string>> = {
  resend: {
    apiKey: () => process.env.RESEND_API_KEY?.trim() ?? "",
    fromEmail: () => process.env.RESEND_FROM_EMAIL?.trim() ?? "",
    fromName: () => process.env.RESEND_FROM_NAME?.trim() ?? "",
  },
  stripe: {
    secretKey: () => process.env.STRIPE_SECRET_KEY?.trim() ?? "",
    publishableKey: () => process.env.STRIPE_PUBLISHABLE_KEY?.trim() ?? "",
    webhookSecret: () => process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "",
  },
  twilio: {
    accountSid: () => process.env.TWILIO_ACCOUNT_SID?.trim() ?? "",
    authToken: () => process.env.TWILIO_AUTH_TOKEN?.trim() ?? "",
    fromSms: () => process.env.TWILIO_FROM_SMS?.trim() ?? "",
    fromWhatsApp: () => process.env.TWILIO_FROM_WHATSAPP?.trim() ?? "",
  },
  youtube: {
    apiKey: () =>
      process.env.YOUTUBE_API_KEY?.trim() ||
      process.env.GOOGLE_API_KEY?.trim() ||
      "",
  },
  google_places: {
    apiKey: () =>
      process.env.GOOGLE_PLACES_API_KEY?.trim() ||
      process.env.GOOGLE_MAPS_API_KEY?.trim() ||
      process.env.GOOGLE_API_KEY?.trim() ||
      "",
  },
  gmail_smtp: {
    host: () => process.env.SMTP_HOST?.trim() || "smtp.gmail.com",
    port: () => process.env.SMTP_PORT?.trim() || "465",
    user: () => process.env.SMTP_USER?.trim() ?? "",
    pass: () => process.env.SMTP_PASS?.trim() ?? "",
    fromEmail: () => process.env.SMTP_FROM_EMAIL?.trim() ?? "",
    fromName: () => process.env.SMTP_FROM_NAME?.trim() ?? "",
    secure: () => process.env.SMTP_SECURE?.trim() || "true",
  },
};

function getEncryptionKey(): Buffer | null {
  const secret = process.env.INTEGRATION_ENCRYPTION_KEY;

  if (!secret) {
    return null;
  }

  return scryptSync(secret, "nextgenmove-integration-secrets", 32);
}

export function encryptIntegrationSecret(plaintext: string): string {
  const key = getEncryptionKey();

  if (!key) {
    return `plain:${Buffer.from(plaintext, "utf8").toString("base64")}`;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    "enc",
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

export function decryptIntegrationSecret(payload: string): string {
  if (payload.startsWith("plain:")) {
    return Buffer.from(payload.slice("plain:".length), "base64").toString("utf8");
  }

  if (!payload.startsWith("enc:")) {
    return payload;
  }

  const key = getEncryptionKey();

  if (!key) {
    throw new Error("missing_encryption_key");
  }

  const [, ivB64, tagB64, dataB64] = payload.split(":");
  const iv = Buffer.from(ivB64!, "base64");
  const tag = Buffer.from(tagB64!, "base64");
  const encrypted = Buffer.from(dataB64!, "base64");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

function envFallbackSecrets(integrationId: string): Record<string, string> {
  const factories = ENV_SECRET_FALLBACKS[integrationId];
  if (!factories) return {};
  const out: Record<string, string> = {};
  for (const [key, read] of Object.entries(factories)) {
    const value = read();
    if (value) out[key] = value;
  }
  return out;
}

export async function storeIntegrationSecret(
  integrationId: string,
  secrets: Record<string, string>,
) {
  const encryptedEntries = Object.fromEntries(
    Object.entries(secrets).map(([key, value]) => [key, encryptIntegrationSecret(value)]),
  );

  await adminDb
    .collection("integration_secrets")
    .doc(integrationId)
    .set(
      stripUndefined({
        integrationId,
        secrets: encryptedEntries,
        updatedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true },
    );
}

export async function getIntegrationSecrets(
  integrationId: string,
): Promise<Record<string, string>> {
  const fromEnv = envFallbackSecrets(integrationId);
  let fromStore: Record<string, string> = {};

  try {
    const snap = await adminDb
      .collection("integration_secrets")
      .doc(integrationId)
      .get();

    if (snap.exists) {
      const encrypted = (snap.data()?.secrets ?? {}) as Record<string, string>;
      for (const [key, value] of Object.entries(encrypted)) {
        try {
          fromStore[key] = decryptIntegrationSecret(value);
        } catch {
          // Skip undecryptable entries
        }
      }
    }
  } catch {
    // Firestore quota/outage — env fallbacks still apply.
  }

  return { ...fromEnv, ...fromStore };
}

export async function isIntegrationConnected(integrationId: string): Promise<boolean> {
  try {
    const snap = await adminDb.collection("integrations").doc(integrationId).get();
    if (snap.exists && snap.data()?.status === "connected") {
      return true;
    }
  } catch {
    // Fall through to env check.
  }

  const secrets = await getIntegrationSecrets(integrationId);
  if (integrationId === "resend") {
    return Boolean(secrets.apiKey?.startsWith("re_") && secrets.fromEmail?.includes("@"));
  }
  if (integrationId === "stripe") {
    return Boolean(secrets.secretKey?.startsWith("sk_"));
  }
  if (integrationId === "twilio") {
    return Boolean(secrets.accountSid && secrets.authToken);
  }
  if (integrationId === "youtube") {
    return Boolean(secrets.apiKey);
  }
  if (integrationId === "google_places") {
    return Boolean(secrets.apiKey);
  }
  if (integrationId === "gmail_smtp") {
    return Boolean(
      secrets.user?.includes("@") &&
        secrets.pass &&
        (secrets.fromEmail?.includes("@") || secrets.user?.includes("@")),
    );
  }
  return Object.keys(secrets).length > 0;
}

export function integrationHasEnvFallback(integrationId: string): boolean {
  return Object.keys(envFallbackSecrets(integrationId)).length > 0;
}
