import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import {
  getAdminSession,
  logActivity,
  unauthorizedResponse,
} from "@/lib/admin/session";
import {
  buildHostingQuote,
  getHostingCatalog,
} from "@/lib/billing/hosting-catalog";
import {
  getHostingStripeClient,
  getHostingStripePublishableKey,
  HostingStripeNotConfiguredError,
} from "@/lib/billing/stripe-hosting";
import { eurosToCents, appBaseUrl } from "@/lib/billing/stripe";
import { stripUndefined } from "@/lib/stripUndefined";
import { logger } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  planId: z.string().min(1),
  periodId: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return unauthorizedResponse();

  try {
    const body = bodySchema.parse(await request.json());
    const catalog = await getHostingCatalog();
    const quote = buildHostingQuote(catalog, body.planId, body.periodId);
    if (!quote) {
      return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
    }

    const plan = catalog.plans.find((item) => item.id === body.planId);
    if (!plan) {
      return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
    }

    const stripe = await getHostingStripeClient();
    const publishableKey = await getHostingStripePublishableKey();
    if (!publishableKey) {
      return NextResponse.json(
        { error: "hosting_stripe_missing_publishable_key" },
        { status: 503 },
      );
    }

    const amountCents = eurosToCents(quote.total);
    if (amountCents < 50) {
      return NextResponse.json({ error: "amount_too_small" }, { status: 400 });
    }

    const orderRef = adminDb.collection("hosting_orders").doc();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: quote.currency.toLowerCase(),
      // Card only — Payment Element should not collect name/email/address.
      payment_method_types: ["card"],
      metadata: {
        kind: "hosting_purchase",
        orderId: orderRef.id,
        adminId: session.uid,
        planId: quote.planId,
        periodId: quote.periodId,
        months: String(quote.months),
      },
      description: `${plan.name} · ${quote.months} months`,
    });

    await orderRef.set(
      stripUndefined({
        id: orderRef.id,
        adminId: session.uid,
        adminEmail: session.email ?? null,
        planId: quote.planId,
        planName: plan.name,
        periodId: quote.periodId,
        months: quote.months,
        currency: quote.currency,
        amount: quote.total,
        amountCents,
        taxAmount: quote.taxAmount,
        status: "pending",
        stripePaymentIntentId: paymentIntent.id,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }),
    );

    await logActivity({
      actorId: session.uid,
      actorRole: session.role,
      action: "hosting_payment_intent_created",
      targetType: "hosting_orders",
      targetId: orderRef.id,
    });

    return NextResponse.json({
      orderId: orderRef.id,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      publishableKey,
      quote,
      returnUrl: `${appBaseUrl(request)}/admin/hosting?paid=1`,
    });
  } catch (error) {
    if (error instanceof HostingStripeNotConfiguredError) {
      return NextResponse.json(
        { error: "hosting_stripe_not_configured" },
        { status: 503 },
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }
    logger.error("hosting_payment_intent_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "payment_intent_failed" }, { status: 500 });
  }
}
