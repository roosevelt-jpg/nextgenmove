import { NextResponse } from "next/server";
import { getStripeClient, getStripeWebhookSecret } from "@/lib/billing/stripe";
import { handleStripeEvent } from "@/lib/billing/checkout";
import { logger } from "@/lib/observability/logger";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  try {
    const webhookSecret = await getStripeWebhookSecret();
    if (!webhookSecret) {
      return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });
    }

    const rawBody = await request.text();
    const stripe = await getStripeClient();
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    await handleStripeEvent(event);

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("stripe_webhook_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "webhook_failed" }, { status: 400 });
  }
}
