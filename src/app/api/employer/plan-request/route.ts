import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";
import {
  getEmployerSession,
  unauthorizedResponse,
} from "@/lib/employer/session";
import { withRequestLog } from "@/lib/observability/api-handler";
import { captureException, logger } from "@/lib/observability/logger";
import {
  getIdempotentResult,
  readIdempotencyKey,
  saveIdempotentResult,
} from "@/lib/security/idempotency";
import {
  clientIpFromRequest,
  enforceRateLimit,
  rateLimitResponse,
} from "@/lib/security/rate-limit";

const planRequestSchema = z.object({
  requestedPlan: z.enum(["track_a", "track_b"]),
});

/** Rate limits: 10 plan requests / company / hour; 30 / IP / hour */
const COMPANY_LIMIT = { limit: 10, windowSec: 3600 };
const IP_LIMIT = { limit: 30, windowSec: 3600 };

export async function POST(request: Request) {
  const session = await getEmployerSession();

  if (!session) {
    return unauthorizedResponse();
  }

  return withRequestLog(
    request,
    {
      route: "/api/employer/plan-request",
      userId: session.user.uid,
      role: session.user.role,
    },
    async () => {
      const ip = clientIpFromRequest(request);

      const [companyLimit, ipLimit] = await Promise.all([
        enforceRateLimit({
          key: `plan_request:company:${session.companyId}`,
          ...COMPANY_LIMIT,
        }),
        enforceRateLimit({
          key: `plan_request:ip:${ip}`,
          ...IP_LIMIT,
        }),
      ]);

      if (!companyLimit.allowed) {
        return rateLimitResponse(companyLimit.retryAfterSec);
      }
      if (!ipLimit.allowed) {
        return rateLimitResponse(ipLimit.retryAfterSec);
      }

      const idempotencyKey = readIdempotencyKey(request);
      if (idempotencyKey) {
        const cached = await getIdempotentResult<{
          body: unknown;
          status: number;
        }>({
          scope: "plan_request",
          actorId: session.companyId,
          key: idempotencyKey,
        });
        if (cached) {
          return NextResponse.json(cached.body, { status: cached.status });
        }
      }

      try {
        const { requestedPlan } = planRequestSchema.parse(await request.json());

        const existingPending = await adminDb
          .collection("requests")
          .where("companyId", "==", session.companyId)
          .where("type", "==", "plan_request")
          .where("status", "==", "pending")
          .limit(1)
          .get();

        if (!existingPending.empty) {
          return NextResponse.json(
            {
              error: "plan_request_already_pending",
              id: existingPending.docs[0]!.id,
            },
            { status: 409 },
          );
        }

        const requestRef = adminDb.collection("requests").doc();
        const body = { id: requestRef.id };

        await requestRef.set(
          stripUndefined({
            id: requestRef.id,
            type: "plan_request",
            companyId: session.companyId,
            payload: {
              requestedPlan,
              currentPlan: session.company.plan,
              companyName: session.company.name,
              contactEmail: session.company.contactEmail,
            },
            status: "pending",
            createdAt: FieldValue.serverTimestamp(),
          }),
        );

        const { notifyPlanRequestReceived } = await import("@/lib/email/notify");
        void notifyPlanRequestReceived({
          companyId: session.companyId,
          planLabel: requestedPlan === "track_a" ? "Track A" : "Track B",
          request,
        });

        if (idempotencyKey) {
          await saveIdempotentResult({
            scope: "plan_request",
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

        await captureException(error, {
          route: "/api/employer/plan-request",
          userId: session.user.uid,
        });
        logger.error("plan_request_failed", {
          userId: session.user.uid,
          error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json({ error: "request_failed" }, { status: 500 });
      }
    },
  );
}
