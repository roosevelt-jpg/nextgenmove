import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import type Stripe from "stripe";
import { adminDb } from "@/lib/firebase-admin";
import {
  getHostingStripeClient,
  getHostingStripeWebhookSecret,
} from "@/lib/billing/stripe-hosting";
import { logger } from "@/lib/observability/logger";
import { stripUndefined } from "@/lib/stripUndefined";

export const runtime = "nodejs";

async function markOrderPaid(paymentIntent: Stripe.PaymentIntent) {
  const orderId = paymentIntent.metadata?.orderId;
  if (!orderId) return;

  const ref = adminDb.collection("hosting_orders").doc(orderId);
  const snap = await ref.get();
  if (!snap.exists) return;

  const status = String(snap.data()?.status ?? "");
  if (status === "paid") return;

  await ref.set(
    stripUndefined({
      status: "paid",
      paidAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      stripePaymentIntentId: paymentIntent.id,
      stripeChargeId:
        typeof paymentIntent.latest_charge === "string"
          ? paymentIntent.latest_charge
          : paymentIntent.latest_charge?.id ?? null,
    }),
    { merge: true },
  );

  await adminDb.collection("site_settings").doc("default").set(
    stripUndefined({
      hostingSubscription: {
        status: "active",
        planId: paymentIntent.metadata?.planId ?? null,
        periodId: paymentIntent.metadata?.periodId ?? null,
        orderId,
        activatedAt: new Date().toISOString(),
      },
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );
}

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
    await markOrderPaid(event.data.object as Stripe.PaymentIntent);
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
