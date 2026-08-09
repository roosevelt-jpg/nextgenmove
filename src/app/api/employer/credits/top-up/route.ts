import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { getProgramLevers } from "@/lib/collections/pages";
import { stripUndefined } from "@/lib/stripUndefined";
import { assertNotPreviewMode } from "@/lib/auth/portal-session";
import {
  getEmployerSession,
  unauthorizedResponse,
} from "@/lib/employer/session";
import { createCompanyCreditTopUpCheckout } from "@/lib/billing/checkout";
import {
  isStripeLive,
  StripeNotConfiguredError,
} from "@/lib/billing/stripe";
import {
  readIdempotencyKey,
  getIdempotentResult,
  saveIdempotentResult,
} from "@/lib/security/idempotency";
import { resolveCompanyCreditPackages } from "@/lib/move-os/company-credits";
import { withRequestLog } from "@/lib/observability/api-handler";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withRequestLog(
    request,
    { route: "/api/employer/credits/top-up" },
    async () => {
      const session = await getEmployerSession();
      if (!session) return unauthorizedResponse();

      const [levers, stripeEnabled, companySnap] = await Promise.all([
        getProgramLevers(),
        isStripeLive(),
        adminDb.collection("companies").doc(session.companyId).get(),
      ]);

      const packages = resolveCompanyCreditPackages(levers);
      const credits = Number(companySnap.data()?.credits ?? 0);
      const autoTopUpThreshold = Number(
        companySnap.data()?.autoTopUpThreshold ?? 0,
      );
      const autoTopUpPackId = String(
        companySnap.data()?.autoTopUpPackId ?? "",
      );

      return NextResponse.json({
        packages,
        credits,
        stripeEnabled,
        autoTopUpThreshold: Number.isFinite(autoTopUpThreshold)
          ? autoTopUpThreshold
          : 0,
        autoTopUpPackId: autoTopUpPackId || null,
      });
    },
  );
}

const requestSchema = z.object({
  packageId: z.string().min(1),
});

export async function POST(request: Request) {
  return withRequestLog(
    request,
    { route: "/api/employer/credits/top-up" },
    async () => {
      const session = await getEmployerSession();
      if (!session) return unauthorizedResponse();

      const previewBlock = assertNotPreviewMode(session.mode);
      if (previewBlock) return previewBlock;

      try {
        const body = requestSchema.parse(await request.json());
        const levers = await getProgramLevers();
        const pack = resolveCompanyCreditPackages(levers).find(
          (item) => item.id === body.packageId,
        );
        if (!pack) {
          return NextResponse.json({ error: "invalid_package" }, { status: 400 });
        }

        if (await isStripeLive()) {
          const idempotencyKey = readIdempotencyKey(request);
          const scope = "employer_company_topup_checkout";

          if (idempotencyKey) {
            const cached = await getIdempotentResult<{
              body: unknown;
              status: number;
            }>({
              scope,
              actorId: session.companyId,
              key: idempotencyKey,
            });
            if (cached) {
              return NextResponse.json(cached.body, { status: cached.status });
            }
          }

          const checkout = await createCompanyCreditTopUpCheckout({
            companyId: session.companyId,
            companyEmail: session.company.contactEmail,
            companyName: session.company.name,
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
              scope,
              actorId: session.companyId,
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
            type: "company_credit_topup",
            companyId: session.companyId,
            studentId: null,
            payload: {
              packageId: pack.id,
              label: pack.label,
              credits: pack.credits,
              priceEur: pack.priceEur,
              companyName: session.company.name,
              contactEmail: session.company.contactEmail,
            },
            status: "pending",
            createdAt: FieldValue.serverTimestamp(),
          }),
        );

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
        console.error("company_credit_topup_failed", error);
        return NextResponse.json({ error: "request_failed" }, { status: 500 });
      }
    },
  );
}
