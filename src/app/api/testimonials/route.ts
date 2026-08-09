import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { getStudentSession } from "@/lib/student/session";
import { getEmployerSession } from "@/lib/employer/session";
import { assertNotPreviewMode } from "@/lib/auth/portal-session";
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
import {
  sanitizeUploadFilename,
  uploadFileViaAdmin,
} from "@/lib/storage/upload-via-admin";
import { withRequestLog } from "@/lib/observability/api-handler";
import { revalidateAdminCollection } from "@/lib/admin/revalidate";
import type { StorageFileRef } from "@/lib/storage/file-ref";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    "name" in value &&
    "type" in value &&
    "size" in value &&
    typeof (value as File).arrayBuffer === "function"
  );
}

async function resolveSubmitter() {
  const student = await getStudentSession();
  if (student) {
    return {
      uid: student.user.uid,
      role: "student" as const,
      displayName: student.student.fullName || student.user.displayName || "Student",
      roleLabel: [student.student.sector, student.student.seniority]
        .filter(Boolean)
        .join(" · "),
      mode: student.mode,
      photoUrl: student.student.photoUrl,
    };
  }
  const employer = await getEmployerSession();
  if (employer) {
    return {
      uid: employer.user.uid,
      role: "company" as const,
      displayName:
        employer.company.contactName ||
        employer.company.name ||
        employer.user.displayName ||
        "Employer",
      roleLabel: [employer.company.name, employer.company.industry]
        .filter(Boolean)
        .join(" · "),
      mode: employer.mode,
      photoUrl:
        typeof employer.company.logoUrl === "string"
          ? employer.company.logoUrl
          : null,
    };
  }
  return null;
}

export async function GET(request: Request) {
  return withRequestLog(request, { route: "/api/testimonials" }, async () => {
    const submitter = await resolveSubmitter();
    if (!submitter) {
      return NextResponse.json({ canSubmit: false });
    }
    return NextResponse.json({
      canSubmit: true,
      displayName: submitter.displayName,
      roleLabel: submitter.roleLabel,
      authorRole: submitter.role,
    });
  });
}

export async function POST(request: Request) {
  return withRequestLog(request, { route: "/api/testimonials" }, async () => {
    const submitter = await resolveSubmitter();
    if (!submitter) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const previewBlock = assertNotPreviewMode(submitter.mode);
    if (previewBlock) return previewBlock;

    const ip = clientIpFromRequest(request);
    const limited = await enforceRateLimit({
      key: `testimonial_submit:uid:${submitter.uid}`,
      limit: 5,
      windowSec: 3600,
    });
    if (!limited.allowed) {
      return rateLimitResponse(limited.retryAfterSec);
    }

    const idempotencyKey = readIdempotencyKey(request);
    if (idempotencyKey) {
      const cached = await getIdempotentResult<{ body: unknown; status: number }>({
        scope: "testimonial_submit",
        actorId: submitter.uid,
        key: idempotencyKey,
      });
      if (cached) {
        return NextResponse.json(cached.body, { status: cached.status });
      }
    }

    try {
      const form = await request.formData();
      const quote = String(form.get("quote") ?? "").trim();
      const ratingRaw = Number(form.get("rating") ?? 0);
      const displayNameOverride = String(form.get("displayName") ?? "").trim();
      const roleLabelOverride = String(form.get("roleLabel") ?? "").trim();
      const photoEntry = form.get("photo");

      const parsed = z
        .object({
          quote: z.string().trim().min(20).max(800),
          rating: z.number().int().min(1).max(5),
          displayName: z.string().trim().min(1).max(120),
          roleLabel: z.string().trim().max(160),
        })
        .parse({
          quote,
          rating: ratingRaw,
          displayName: displayNameOverride || submitter.displayName,
          roleLabel: roleLabelOverride || submitter.roleLabel || "",
        });

      let photo: StorageFileRef | null = null;
      if (isUploadFile(photoEntry)) {
        const contentType = String(photoEntry.type || "");
        if (!contentType.startsWith("image/")) {
          return NextResponse.json({ error: "invalid_photo_type" }, { status: 400 });
        }
        if (photoEntry.size <= 0 || photoEntry.size > MAX_PHOTO_BYTES) {
          return NextResponse.json({ error: "invalid_photo_size" }, { status: 400 });
        }
        const filename = sanitizeUploadFilename(
          String(photoEntry.name || "testimonial.jpg"),
        );
        const path = `testimonials/${submitter.uid}/${Date.now()}-${filename}`;
        const uploaded = await uploadFileViaAdmin({
          path,
          buffer: Buffer.from(await photoEntry.arrayBuffer()),
          contentType,
          filename,
        });
        photo = {
          url: uploaded.url,
          path: uploaded.path,
          filename: uploaded.filename,
          size: uploaded.size,
          mimeType: uploaded.mimeType,
          uploadedAt: new Date().toISOString(),
        };
      } else if (submitter.photoUrl) {
        photo = {
          url: submitter.photoUrl,
          path: "",
          filename: "profile",
          size: null,
          mimeType: "",
          uploadedAt: null,
        };
      }

      const ref = adminDb.collection("testimonials").doc();
      const doc = stripUndefined({
        id: ref.id,
        authorUid: submitter.uid,
        authorRole: submitter.role,
        displayName: parsed.displayName,
        roleLabel: parsed.roleLabel,
        quote: parsed.quote,
        rating: parsed.rating,
        photo,
        status: "pending" as const,
        publishedAt: null,
        reviewedBy: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      await ref.set(doc);

      revalidateAdminCollection("testimonials");

      const body = { ok: true, id: ref.id, status: "pending" as const };
      if (idempotencyKey) {
        await saveIdempotentResult({
          scope: "testimonial_submit",
          actorId: submitter.uid,
          key: idempotencyKey,
          response: { body, status: 200 },
          status: 200,
        });
      }
      return NextResponse.json(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: "invalid_body" }, { status: 400 });
      }
      console.error("testimonial_submit_failed", error);
      return NextResponse.json({ error: "submit_failed" }, { status: 500 });
    }
  });
}
