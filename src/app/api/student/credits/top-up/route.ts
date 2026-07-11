import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { getProgramLevers } from "@/lib/collections/pages";
import { stripUndefined } from "@/lib/stripUndefined";
import { assertNotPreviewMode } from "@/lib/auth/portal-session";
import {
  getStudentSession,
  unauthorizedResponse,
} from "@/lib/student/session";
import {
  createCreditTopUpCheckout,
} from "@/lib/billing/checkout";
import { isStripeLive, StripeNotConfiguredError } from "@/lib/billing/stripe";
import {
  readIdempotencyKey,
  getIdempotentResult,
  saveIdempotentResult,
} from "@/lib/security/idempotency";

export async function GET() {
  const session = await getStudentSession();
  if (!session) return unauthorizedResponse();

  const levers = await getProgramLevers();
  const stripeEnabled = await isStripeLive();
  return NextResponse.json({
    packages: levers?.creditTopUpPackages ?? [],
    creditsPerEuro: levers?.creditsPerEuro ?? 4,
    placementFeeEur: levers?.placementFeeEur ?? 350,
    stripeEnabled,
  });
}

const requestSchema = z.object({
  packageId: z.string().min(1),
});

/**
 * When Stripe is connected: create Checkout (card charge).
 * Otherwise: create admin-approval request (manual path).
 */
export async function POST(request: Request) {
  const session = await getStudentSession();
  if (!session) return unauthorizedResponse();

  const previewBlock = assertNotPreviewMode(session.mode);
  if (previewBlock) return previewBlock;

  try {
    const { packageId } = requestSchema.parse(await request.json());
    const levers = await getProgramLevers();
    const pack = (levers?.creditTopUpPackages ?? []).find(
      (item) => item.id === packageId,
    );

    if (!pack) {
      return NextResponse.json({ error: "invalid_package" }, { status: 400 });
    }

    if (await isStripeLive()) {
      const idempotencyKey = readIdempotencyKey(request);
      if (idempotencyKey) {
        const cached = await getIdempotentResult<{ body: unknown; status: number }>({
          scope: "student_topup_checkout",
          actorId: session.studentId,
          key: idempotencyKey,
        });
        if (cached) {
          return NextResponse.json(cached.body, { status: cached.status });
        }
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

      const body = { mode: "stripe", url: checkout.url, sessionId: checkout.sessionId };
      if (idempotencyKey) {
        await saveIdempotentResult({
          scope: "student_topup_checkout",
          actorId: session.studentId,
          key: idempotencyKey,
          response: { body, status: 200 },
          status: 200,
        });
      }
      return NextResponse.json(body);
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
      return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
    }
    console.error("credit_topup_request_failed", error);
    return NextResponse.json({ error: "request_failed" }, { status: 500 });
  }
}
