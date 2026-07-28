import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  getHostingStripeClient,
  getHostingStripeWebhookSecret,
} from "@/lib/billing/stripe-hosting";
import { activateHostingFromPaymentIntent } from "@/lib/billing/hosting-activation";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { logger } from "@/lib/observability/logger";

export const runtime = "nodejs";

async function handleHostingStripeEvent(event: Stripe.Event) {
  const eventRef = adminDb.collection("stripe_webhook_events").doc(event.id);
  const existing = await eventRef.get();
  if (existing.exists) return;

  await eventRef.set({
    id: event.id,
    type: event.type,
    source: "stripe_hosting",
    createdAt: FieldValue.serverTimestamp(),
  });

  if (event.type === "payment_intent.succeeded") {
    await activateHostingFromPaymentIntent(
      event.data.object as Stripe.PaymentIntent,
    );
  }
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  try {
    const webhookSecret = await getHostingStripeWebhookSecret();
    if (!webhookSecret) {
      return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });
    }

    const rawBody = await request.text();
    const stripe = await getHostingStripeClient();
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );

    await handleHostingStripeEvent(event);

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("stripe_hosting_webhook_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "webhook_failed" }, { status: 400 });
  }
}
