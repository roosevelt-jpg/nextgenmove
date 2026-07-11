import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";
import { getPublishedCmsFormBySlug } from "@/lib/collections/site-settings";
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

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;

  return withRequestLog(request, { route: `/api/forms/${slug}/submit` }, async () => {
    const ip = clientIpFromRequest(request);
    const limited = await enforceRateLimit({
      key: `form_submit:ip:${ip}`,
      limit: 20,
      windowSec: 3600,
    });
    if (!limited.allowed) {
      return rateLimitResponse(limited.retryAfterSec);
    }

    const form = await getPublishedCmsFormBySlug(slug);
    if (!form) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const idempotencyKey = readIdempotencyKey(request);
    if (idempotencyKey) {
      const cached = await getIdempotentResult<{ body: unknown; status: number }>({
        scope: "cms_form_submit",
        actorId: `${slug}:${ip}`,
        key: idempotencyKey,
      });
      if (cached) {
        return NextResponse.json(cached.body, { status: cached.status });
      }
    }

    try {
      const body = (await request.json()) as { values?: Record<string, string> };
      const values = body.values ?? {};
      const fields = form.fields ?? [];

      for (const field of fields) {
        if (field.required && !String(values[field.key] ?? "").trim()) {
          return NextResponse.json({ error: "missing_required" }, { status: 400 });
        }
      }

      const ref = adminDb.collection("form_submissions").doc();
      await ref.set(
        stripUndefined({
          id: ref.id,
          formId: form.id,
          formSlug: form.slug,
          values,
          createdAt: FieldValue.serverTimestamp(),
        }),
      );

      const emailField =
        values.email ||
        values.workEmail ||
        values.contactEmail ||
        Object.values(values).find((v) => String(v).includes("@"));
      if (emailField && String(emailField).includes("@")) {
        const { notifyFormSubmissionAck } = await import("@/lib/email/notify");
        void notifyFormSubmissionAck({
          to: String(emailField).trim(),
          formTitle: form.title || form.slug,
          displayName: values.name || values.contactName || values.fullName,
          request,
        });
      }

      const responseBody = { ok: true, id: ref.id };
      if (idempotencyKey) {
        await saveIdempotentResult({
          scope: "cms_form_submit",
          actorId: `${slug}:${ip}`,
          key: idempotencyKey,
          response: { body: responseBody, status: 200 },
          status: 200,
        });
      }

      return NextResponse.json(responseBody);
    } catch (error) {
      logger.error("cms_form_submit_failed", {
        error: error instanceof Error ? error.message : String(error),
        route: `/api/forms/${slug}/submit`,
      });
      return NextResponse.json({ error: "submit_failed" }, { status: 500 });
    }
  });
}
