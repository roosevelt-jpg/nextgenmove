import Stripe from "stripe";
import {
  getIntegrationSecrets,
  isIntegrationConnected,
} from "@/lib/admin/integration-secrets";
import { adminDb } from "@/lib/firebase-admin";

const STRIPE_INTEGRATION_ID = "stripe";

export class StripeNotConfiguredError extends Error {
  constructor(message = "stripe_not_configured") {
    super(message);
    this.name = "StripeNotConfiguredError";
  }
}

export async function isStripeLive(): Promise<boolean> {
  if (!(await isIntegrationConnected(STRIPE_INTEGRATION_ID))) {
    return false;
  }
  const secrets = await getIntegrationSecrets(STRIPE_INTEGRATION_ID);
  return Boolean(secrets.secretKey?.startsWith("sk_"));
}

export async function getStripeClient(): Promise<Stripe> {
  if (!(await isIntegrationConnected(STRIPE_INTEGRATION_ID))) {
    throw new StripeNotConfiguredError();
  }

  const secrets = await getIntegrationSecrets(STRIPE_INTEGRATION_ID);
  const secretKey = secrets.secretKey?.trim();

  if (!secretKey?.startsWith("sk_")) {
    throw new StripeNotConfiguredError("stripe_missing_secret_key");
  }

  return new Stripe(secretKey, {
    apiVersion: Stripe.API_VERSION,
    typescript: true,
  });
}

export async function getStripeWebhookSecret(): Promise<string | null> {
  const secrets = await getIntegrationSecrets(STRIPE_INTEGRATION_ID);
  return secrets.webhookSecret?.trim() || null;
}

export async function getStripePublishableKey(): Promise<string | null> {
  const snap = await adminDb.collection("integrations").doc(STRIPE_INTEGRATION_ID).get();
  const fromConfig = String(snap.data()?.config?.publishableKey ?? "").trim();
  if (fromConfig.startsWith("pk_")) return fromConfig;

  const secrets = await getIntegrationSecrets(STRIPE_INTEGRATION_ID);
  const fromSecrets = secrets.publishableKey?.trim() ?? "";
  return fromSecrets.startsWith("pk_") ? fromSecrets : null;
}

export function appBaseUrl(request?: Request): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    process.env.VERCEL_URL;
  if (fromEnv) {
    return fromEnv.startsWith("http") ? fromEnv.replace(/\/$/, "") : `https://${fromEnv}`;
  }
  if (request) {
    const url = new URL(request.url);
    return `${url.protocol}//${url.host}`;
  }
  return "http://localhost:3002";
}

export function eurosToCents(amountEur: number): number {
  return Math.round(amountEur * 100);
}

export { STRIPE_INTEGRATION_ID };
