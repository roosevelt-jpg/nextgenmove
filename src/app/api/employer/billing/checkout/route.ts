import { NextResponse } from "next/server";
import { z } from "zod";
import { assertNotPreviewMode } from "@/lib/auth/portal-session";
import {
  getEmployerSession,
  unauthorizedResponse,
} from "@/lib/employer/session";
import {
  createBillingPortalSession,
  createEmployerSubscriptionCheckout,
} from "@/lib/billing/checkout";
import { isStripeLive, StripeNotConfiguredError } from "@/lib/billing/stripe";
import { withRequestLog } from "@/lib/observability/api-handler";
import {
  clientIpFromRequest,
  enforceRateLimit,
  rateLimitResponse,
} from "@/lib/security/rate-limit";
import {
  getIdempotentResult,
  readIdempotencyKey,
  saveIdempotentResult,
} from "@/lib/security/idempotency";

const schema = z.object({
  plan: z.enum(["track_a", "track_b"]),
});

export async function GET() {
  const session = await getEmployerSession();
  if (!session) return unauthorizedResponse();

  const stripeEnabled = await isStripeLive();
  return NextResponse.json({
    stripeEnabled,
    hasCustomer: Boolean(session.company.stripeCustomerId),
  });
}

export async function POST(request: Request) {
  const session = await getEmployerSession();
  if (!session) return unauthorizedResponse();

  const previewBlock = assertNotPreviewMode(session.mode);
  if (previewBlock) return previewBlock;

  return withRequestLog(
    request,
    {
      route: "/api/employer/billing/checkout",
      userId: session.user.uid,
      role: session.user.role,
    },
    async () => {
      const ip = clientIpFromRequest(request);
      const limited = await enforceRateLimit({
        key: `billing_checkout:company:${session.companyId}`,
        limit: 10,
        windowSec: 3600,
      });
      if (!limited.allowed) return rateLimitResponse(limited.retryAfterSec);

      const idempotencyKey = readIdempotencyKey(request);
      if (idempotencyKey) {
        const cached = await getIdempotentResult<{ body: unknown; status: number }>({
          scope: "employer_billing_checkout",
          actorId: session.companyId,
          key: idempotencyKey,
        });
        if (cached) {
          return NextResponse.json(cached.body, { status: cached.status });
        }
      }

      try {
        if (!(await isStripeLive())) {
          return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
        }

        const { plan } = schema.parse(await request.json());
        const companyData = session.company;

        const result = await createEmployerSubscriptionCheckout({
          companyId: session.companyId,
          companyName: session.company.name,
          contactEmail: session.company.contactEmail,
          plan,
          stripeCustomerId: companyData.stripeCustomerId ?? null,
          request,
        });

        const body = { url: result.url, sessionId: result.sessionId, mode: "stripe" };
        if (idempotencyKey) {
          await saveIdempotentResult({
            scope: "employer_billing_checkout",
            actorId: session.companyId,
            key: idempotencyKey,
            response: { body, status: 200 },
            status: 200,
          });
        }
        return NextResponse.json(body);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json({ error: "invalid_request" }, { status: 400 });
        }
        if (error instanceof StripeNotConfiguredError) {
          return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
        }
        return NextResponse.json({ error: "checkout_failed" }, { status: 500 });
      }
    },
  );
}

/** Create Stripe Customer Portal session for payment method / cancel. */
export async function PUT(request: Request) {
  const session = await getEmployerSession();
  if (!session) return unauthorizedResponse();

  const previewBlock = assertNotPreviewMode(session.mode);
  if (previewBlock) return previewBlock;

  try {
    const companyData = session.company;
    if (!companyData.stripeCustomerId) {
      return NextResponse.json({ error: "no_stripe_customer" }, { status: 400 });
    }
    const url = await createBillingPortalSession({
      stripeCustomerId: companyData.stripeCustomerId,
      request,
    });
    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof StripeNotConfiguredError) {
      return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
    }
    return NextResponse.json({ error: "portal_failed" }, { status: 500 });
  }
}
