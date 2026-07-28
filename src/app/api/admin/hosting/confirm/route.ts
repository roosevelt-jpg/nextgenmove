import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAdminSession,
  logActivity,
  unauthorizedResponse,
} from "@/lib/admin/session";
import { activateHostingFromPaymentIntent } from "@/lib/billing/hosting-activation";
import {
  getHostingStripeClient,
  HostingStripeNotConfiguredError,
} from "@/lib/billing/stripe-hosting";
import { logger } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  paymentIntentId: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return unauthorizedResponse();

  try {
    const body = bodySchema.parse(await request.json());
    const stripe = await getHostingStripeClient();
    const paymentIntent = await stripe.paymentIntents.retrieve(
      body.paymentIntentId,
    );

    if (
      paymentIntent.status !== "succeeded" &&
      paymentIntent.status !== "processing"
    ) {
      return NextResponse.json(
        { error: "payment_not_complete", status: paymentIntent.status },
        { status: 409 },
      );
    }

    const result = await activateHostingFromPaymentIntent(paymentIntent);
    if (!result) {
      return NextResponse.json({ error: "order_not_found" }, { status: 404 });
    }

    await logActivity({
      actorId: session.uid,
      actorRole: session.role,
      action: "hosting_marked_active",
      targetType: "hosting_orders",
      targetId: result.orderId,
    });

    return NextResponse.json({
      ok: true,
      orderId: result.orderId,
      alreadyPaid: result.alreadyPaid,
      hostingStatus: "active",
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
    logger.error("hosting_confirm_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "confirm_failed" }, { status: 500 });
  }
}
