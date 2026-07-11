import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";
import { assertNotPreviewMode } from "@/lib/auth/portal-session";
import { getStudentSession, unauthorizedResponse } from "@/lib/student/session";
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
import { assertSufficientCredits } from "@/lib/credits/pure";

const purchaseSchema = z.object({
  contentItemId: z.string().min(1),
});

/** Rate limits: 20 redeem attempts / user / minute; 60 / IP / minute */
const USER_LIMIT = { limit: 20, windowSec: 60 };
const IP_LIMIT = { limit: 60, windowSec: 60 };

export async function POST(request: Request) {
  const session = await getStudentSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const previewBlock = assertNotPreviewMode(session.mode);
  if (previewBlock) return previewBlock;

  return withRequestLog(
    request,
    {
      route: "/api/student/store/purchase",
      userId: session.user.uid,
      role: session.user.role,
    },
    async () => {
      const ip = clientIpFromRequest(request);

      const [userLimit, ipLimit] = await Promise.all([
        enforceRateLimit({
          key: `redeem:uid:${session.studentId}`,
          ...USER_LIMIT,
        }),
        enforceRateLimit({
          key: `redeem:ip:${ip}`,
          ...IP_LIMIT,
        }),
      ]);

      if (!userLimit.allowed) {
        return rateLimitResponse(userLimit.retryAfterSec);
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
          scope: "student_redeem",
          actorId: session.studentId,
          key: idempotencyKey,
        });
        if (cached) {
          return NextResponse.json(cached.body, { status: cached.status });
        }
      }

      try {
        const { contentItemId } = purchaseSchema.parse(await request.json());

        const result = await adminDb.runTransaction(async (transaction) => {
          const studentRef = adminDb.collection("students").doc(session.studentId);
          const contentRef = adminDb.collection("content_items").doc(contentItemId);
          const purchaseQuery = adminDb
            .collection("content_purchases")
            .where("studentId", "==", session.studentId)
            .where("contentItemId", "==", contentItemId)
            .limit(1);

          const studentDoc = await transaction.get(studentRef);
          const contentDoc = await transaction.get(contentRef);
          const existingPurchase = await transaction.get(purchaseQuery);

          if (!studentDoc.exists || !contentDoc.exists) {
            throw new Error("not_found");
          }

          const studentData = studentDoc.data()!;
          const contentData = contentDoc.data()!;

          if (contentData.status !== "live") {
            throw new Error("not_available");
          }

          if (!existingPurchase.empty) {
            return {
              alreadyPurchased: true,
              downloadHref: `/api/student/store/download/${contentItemId}`,
              credits: studentData.credits ?? 0,
            };
          }

          const cost = contentData.costCredits ?? 0;
          const currentCredits = studentData.credits ?? 0;

          assertSufficientCredits(currentCredits, cost);

          const purchaseRef = adminDb.collection("content_purchases").doc();
          const creditTxRef = adminDb.collection("credit_transactions").doc();

          transaction.set(
            purchaseRef,
            stripUndefined({
              id: purchaseRef.id,
              studentId: session.studentId,
              contentItemId,
              creditsCost: cost,
              purchasedAt: FieldValue.serverTimestamp(),
            }),
          );

          transaction.update(
            studentRef,
            stripUndefined({
              credits: currentCredits - cost,
            }),
          );

          if (cost > 0) {
            transaction.set(
              creditTxRef,
              stripUndefined({
                id: creditTxRef.id,
                studentId: session.studentId,
                direction: "spend",
                source: `redeem:${contentItemId}`,
                amount: cost,
                relatedContentId: contentItemId,
                createdAt: FieldValue.serverTimestamp(),
              }),
            );
          }

          return {
            alreadyPurchased: false,
            purchaseId: purchaseRef.id,
            downloadHref: `/api/student/store/download/${contentItemId}`,
            credits: currentCredits - cost,
          };
        });

        if (idempotencyKey) {
          await saveIdempotentResult({
            scope: "student_redeem",
            actorId: session.studentId,
            key: idempotencyKey,
            response: { body: result, status: 200 },
            status: 200,
          });
        }

        if (
          !result.alreadyPurchased &&
          typeof result.credits === "number"
        ) {
          const { notifyLowCreditBalance } = await import("@/lib/email/notify");
          const leversSnap = await adminDb
            .collection("program_levers")
            .doc("default")
            .get();
          const threshold = Number(leversSnap.data()?.lowCreditThreshold ?? 50);
          if (result.credits <= threshold) {
            void notifyLowCreditBalance({
              studentId: session.studentId,
              credits: result.credits,
              threshold,
              request,
            });
          }
        }

        return NextResponse.json(result);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json({ error: "invalid_request" }, { status: 400 });
        }

        const message = error instanceof Error ? error.message : "purchase_failed";

        if (message === "insufficient_credits") {
          return NextResponse.json({ error: "insufficient_credits" }, { status: 402 });
        }

        if (message === "not_found" || message === "not_available") {
          return NextResponse.json({ error: message }, { status: 404 });
        }

        await captureException(error, {
          route: "/api/student/store/purchase",
          userId: session.user.uid,
        });
        logger.error("student_purchase_failed", {
          userId: session.user.uid,
          error: message,
        });
        return NextResponse.json({ error: "purchase_failed" }, { status: 500 });
      }
    },
  );
}
