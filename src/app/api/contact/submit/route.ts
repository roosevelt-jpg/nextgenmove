import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { notifyFormSubmissionAck } from "@/lib/email/notify";
import { notifyAdminsOfPending } from "@/lib/email/notify-admins";
import { stripUndefined } from "@/lib/stripUndefined";
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
import { withRequestLog } from "@/lib/observability/api-handler";
import { logger } from "@/lib/observability/logger";

const submitSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional(),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(5000),
});

export async function POST(request: Request) {
  return withRequestLog(request, { route: "/api/contact/submit" }, async () => {
    const ip = clientIpFromRequest(request);
    const limited = await enforceRateLimit({
      key: `contact_submit:ip:${ip}`,
      limit: 12,
      windowSec: 3600,
    });
    if (!limited.allowed) {
      return rateLimitResponse(limited.retryAfterSec);
    }

    const idempotencyKey = readIdempotencyKey(request);
    if (idempotencyKey) {
      const cached = await getIdempotentResult<{ body: unknown; status: number }>({
        scope: "contact_submit",
        actorId: ip,
        key: idempotencyKey,
      });
      if (cached) {
        return NextResponse.json(cached.body, { status: cached.status });
      }
    }

    try {
      const parsed = submitSchema.parse(await request.json());
      const phone = parsed.phone?.trim() || null;

      const ref = adminDb.collection("contact_submissions").doc();
      await ref.set(
        stripUndefined({
          id: ref.id,
          name: parsed.name,
          email: parsed.email.toLowerCase(),
          phone,
          subject: parsed.subject,
          message: parsed.message,
          status: "new",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        }),
      );

      void notifyFormSubmissionAck({
        to: parsed.email,
        formTitle: parsed.subject,
        displayName: parsed.name,
        request,
      });

      void notifyAdminsOfPending(
        `Contact: ${parsed.name} — ${parsed.subject}`,
        request,
        {
          link: "/admin/contact",
          title: "New contact message",
        },
      );

      const responseBody = { ok: true, id: ref.id };
      if (idempotencyKey) {
        await saveIdempotentResult({
          scope: "contact_submit",
          actorId: ip,
          key: idempotencyKey,
          response: { body: responseBody, status: 200 },
          status: 200,
        });
      }

      return NextResponse.json(responseBody);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: "missing_required" }, { status: 400 });
      }
      logger.error("contact_submit_failed", {
        error: error instanceof Error ? error.message : String(error),
        route: "/api/contact/submit",
      });
      return NextResponse.json({ error: "submit_failed" }, { status: 500 });
    }
  });
}
