import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";

const ALGORITHM = "aes-256-gcm";

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
  const snap = await adminDb
    .collection("integration_secrets")
    .doc(integrationId)
    .get();

  if (!snap.exists) {
    return {};
  }

  const encrypted = (snap.data()?.secrets ?? {}) as Record<string, string>;
  const decrypted: Record<string, string> = {};

  for (const [key, value] of Object.entries(encrypted)) {
    try {
      decrypted[key] = decryptIntegrationSecret(value);
    } catch {
      // Skip undecryptable entries
    }
  }

  return decrypted;
}

export async function isIntegrationConnected(integrationId: string): Promise<boolean> {
  const snap = await adminDb.collection("integrations").doc(integrationId).get();
  return snap.exists && snap.data()?.status === "connected";
}
