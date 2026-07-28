import Stripe from "stripe";
import {
  getIntegrationSecrets,
  isIntegrationConnected,
} from "@/lib/admin/integration-secrets";
import { adminDb } from "@/lib/firebase-admin";

export const STRIPE_HOSTING_INTEGRATION_ID = "stripe_hosting";

export class HostingStripeNotConfiguredError extends Error {
  constructor(message = "hosting_stripe_not_configured") {
    super(message);
    this.name = "HostingStripeNotConfiguredError";
  }
}

export async function isHostingStripeLive(): Promise<boolean> {
  if (!(await isIntegrationConnected(STRIPE_HOSTING_INTEGRATION_ID))) {
    return false;
  }
  const secrets = await getIntegrationSecrets(STRIPE_HOSTING_INTEGRATION_ID);
  return Boolean(secrets.secretKey?.startsWith("sk_"));
}

export async function getHostingStripeClient(): Promise<Stripe> {
  if (!(await isIntegrationConnected(STRIPE_HOSTING_INTEGRATION_ID))) {
    throw new HostingStripeNotConfiguredError();
  }

  const secrets = await getIntegrationSecrets(STRIPE_HOSTING_INTEGRATION_ID);
  const secretKey = secrets.secretKey?.trim();

  if (!secretKey?.startsWith("sk_")) {
    throw new HostingStripeNotConfiguredError("hosting_stripe_missing_secret_key");
  }

  return new Stripe(secretKey, {
    apiVersion: Stripe.API_VERSION,
    typescript: true,
  });
}

export async function getHostingStripeWebhookSecret(): Promise<string | null> {
  const secrets = await getIntegrationSecrets(STRIPE_HOSTING_INTEGRATION_ID);
  return secrets.webhookSecret?.trim() || null;
}

export async function getHostingStripePublishableKey(): Promise<string | null> {
  const snap = await adminDb
    .collection("integrations")
    .doc(STRIPE_HOSTING_INTEGRATION_ID)
    .get();
  const fromConfig = String(snap.data()?.config?.publishableKey ?? "").trim();
  if (fromConfig.startsWith("pk_")) return fromConfig;

  const secrets = await getIntegrationSecrets(STRIPE_HOSTING_INTEGRATION_ID);
  const fromSecrets = secrets.publishableKey?.trim() ?? "";
  return fromSecrets.startsWith("pk_") ? fromSecrets : null;
}
