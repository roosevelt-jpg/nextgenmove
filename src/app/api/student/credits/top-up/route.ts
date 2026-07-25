import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { getProgramLevers } from "@/lib/collections/pages";
import { getSiteSettings } from "@/lib/collections/site-settings";
import { stripUndefined } from "@/lib/stripUndefined";
import { assertNotPreviewMode } from "@/lib/auth/portal-session";
import {
  getStudentSession,
  unauthorizedResponse,
} from "@/lib/student/session";
import {
  createCreditTopUpCheckout,
  createCreditTopUpPaymentIntent,
} from "@/lib/billing/checkout";
import {
  getStripePublishableKey,
  isStripeLive,
  StripeNotConfiguredError,
} from "@/lib/billing/stripe";
import {
  readIdempotencyKey,
  getIdempotentResult,
  saveIdempotentResult,
} from "@/lib/security/idempotency";
import {
  currencySymbol,
  normalizeCurrencyCode,
} from "@/lib/public/currency";
import { convertAmount } from "@/lib/public/fx";

export async function GET() {
  const session = await getStudentSession();
  if (!session) return unauthorizedResponse();

  const [levers, stripeEnabled, settings, publishableKey] = await Promise.all([
    getProgramLevers(),
    isStripeLive(),
    getSiteSettings(),
    getStripePublishableKey(),
  ]);

  const currency = normalizeCurrencyCode(settings.defaultCurrency);
  const packs = levers?.creditTopUpPackages ?? [];

  let fxRate: number | null = null;
  let packages = packs.map((pack) => ({
    ...pack,
    priceDisplay: pack.priceEur,
  }));

  if (currency !== "EUR") {
    try {
      const { amount: _sample, quote } = await convertAmount(1, "EUR", currency);
      fxRate = quote.rate;
      packages = packs.map((pack) => ({
        ...pack,
        priceDisplay:
          Math.round(pack.priceEur * quote.rate * 100) / 100,
      }));
      void _sample;
    } catch {
      // Keep EUR display amounts when FX is unavailable.
    }
  }

  return NextResponse.json({
    packages,
    creditsPerEuro: levers?.creditsPerEuro ?? 4,
    placementFeeEur: levers?.placementFeeEur ?? 350,
    stripeEnabled,
    publishableKey: stripeEnabled ? publishableKey : null,
    currency,
    currencySymbol: currencySymbol(currency),
    fxRate,
  });
}

const requestSchema = z.object({
  packageId: z.string().min(1),
  /** Prefer Payment Element; fall back to Checkout URL when omitted/unavailable. */
  flow: z.enum(["element", "checkout"]).optional(),
});

/**
 * When Stripe is connected: create PaymentIntent (element) or Checkout Session.
 * Otherwise: create admin-approval request (manual path).
 */
export async function POST(request: Request) {
  const session = await getStudentSession();
  if (!session) return unauthorizedResponse();

  const previewBlock = assertNotPreviewMode(session.mode);
  if (previewBlock) return previewBlock;

  try {
    const body = requestSchema.parse(await request.json());
    const { packageId } = body;
    const flow = body.flow ?? "element";
    const levers = await getProgramLevers();
    const pack = (levers?.creditTopUpPackages ?? []).find(
      (item) => item.id === packageId,
    );

    if (!pack) {
      return NextResponse.json({ error: "invalid_package" }, { status: 400 });
    }

    if (await isStripeLive()) {
      const idempotencyKey = readIdempotencyKey(request);
      const scope =
        flow === "checkout"
          ? "student_topup_checkout"
          : "student_topup_payment_intent";

      if (idempotencyKey) {
        const cached = await getIdempotentResult<{
          body: unknown;
          status: number;
        }>({
          scope,
          actorId: session.studentId,
          key: idempotencyKey,
        });
        if (cached) {
          return NextResponse.json(cached.body, { status: cached.status });
        }
      }

      if (flow === "element") {
        try {
          const publishableKey = await getStripePublishableKey();
          if (!publishableKey) {
            throw new Error("publishable_key_missing");
          }

          const intent = await createCreditTopUpPaymentIntent({
            studentId: session.studentId,
            studentEmail: session.student.email,
            packageId: pack.id,
            credits: pack.credits,
            priceEur: pack.priceEur,
            label: pack.label,
          });

          const responseBody = {
            mode: "payment_element" as const,
            clientSecret: intent.clientSecret,
            paymentIntentId: intent.paymentIntentId,
            publishableKey,
            amountMinor: intent.amountMinor,
            currency: intent.currency,
            fxRate: intent.fxRate,
            fxDate: intent.fxDate,
          };

          if (idempotencyKey) {
            await saveIdempotentResult({
              scope,
              actorId: session.studentId,
              key: idempotencyKey,
              response: { body: responseBody, status: 200 },
              status: 200,
            });
          }
          return NextResponse.json(responseBody);
        } catch (elementError) {
          console.warn(
            "credit_topup_element_failed",
            elementError instanceof Error
              ? elementError.message
              : String(elementError),
          );
          return NextResponse.json(
            { error: "payment_element_unavailable" },
            { status: 503 },
          );
        }
      }

      if (flow !== "checkout") {
        return NextResponse.json(
          { error: "payment_element_required" },
          { status: 400 },
        );
      }

      const checkout = await createCreditTopUpCheckout({
        studentId: session.studentId,
        studentEmail: session.student.email,
        studentName: session.student.fullName,
        packageId: pack.id,
        credits: pack.credits,
        priceEur: pack.priceEur,
        label: pack.label,
        request,
      });

      const checkoutBody = {
        mode: "stripe" as const,
        url: checkout.url,
        sessionId: checkout.sessionId,
      };
      if (idempotencyKey) {
        await saveIdempotentResult({
          scope: "student_topup_checkout",
          actorId: session.studentId,
          key: idempotencyKey,
          response: { body: checkoutBody, status: 200 },
          status: 200,
        });
      }
      return NextResponse.json(checkoutBody);
    }

    const requestRef = adminDb.collection("requests").doc();
    await requestRef.set(
      stripUndefined({
        id: requestRef.id,
        type: "credit_topup",
        studentId: session.studentId,
        companyId: null,
        payload: {
          packageId: pack.id,
          label: pack.label,
          credits: pack.credits,
          priceEur: pack.priceEur,
          studentName: session.student.fullName,
          studentEmail: session.student.email,
        },
        status: "pending",
        createdAt: FieldValue.serverTimestamp(),
      }),
    );

    const { notifyTopUpRequested } = await import("@/lib/email/notify");
    void notifyTopUpRequested({
      studentId: session.studentId,
      packageLabel: pack.label,
      credits: pack.credits,
      priceEur: pack.priceEur,
      request,
    });

    return NextResponse.json({ mode: "manual", id: requestRef.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    if (error instanceof StripeNotConfiguredError) {
      return NextResponse.json(
        { error: "stripe_not_configured" },
        { status: 503 },
      );
    }
    console.error("credit_topup_request_failed", error);
    return NextResponse.json({ error: "request_failed" }, { status: 500 });
  }
}
