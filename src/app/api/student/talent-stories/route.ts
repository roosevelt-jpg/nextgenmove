import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { getStudentSession, unauthorizedResponse } from "@/lib/student/session";
import { assertNotPreviewMode } from "@/lib/auth/portal-session";
import { stripUndefined } from "@/lib/stripUndefined";
import {
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
import { parseYoutubeVideoId } from "@/lib/media/youtube";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const bodySchema = z.object({
  quote: z.string().trim().min(20).max(800),
  corridor: z.string().trim().max(80).optional(),
  youtubeVideoId: z.string().trim().max(120).optional(),
  displayName: z.string().trim().min(1).max(80).optional(),
});

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

function isPlacedStudent(student: {
  status?: string;
  benchStatus?: string;
}): boolean {
  return student.status === "placed" || student.benchStatus === "placed";
}

export async function GET(request: Request) {
  return withRequestLog(
    request,
    { route: "/api/student/talent-stories" },
    async () => {
      const session = await getStudentSession();
      if (!session) return unauthorizedResponse();

      const studentSnap = await adminDb
        .collection("students")
        .doc(session.studentId)
        .get();
      const studentData = studentSnap.data() ?? {};
      const canSubmit = isPlacedStudent({
        status: session.student.status,
        benchStatus: String(studentData.benchStatus ?? ""),
      });

      const existing = await adminDb
        .collection("talent_stories")
        .where("studentId", "==", session.studentId)
        .limit(5)
        .get();

      return NextResponse.json({
        canSubmit,
        submissions: existing.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            status: data.status ?? "pending",
            quote: data.quote ?? "",
            corridor: data.corridor ?? null,
          };
        }),
      });
    },
  );
}

export async function POST(request: Request) {
  return withRequestLog(
    request,
    { route: "/api/student/talent-stories" },
    async () => {
      const session = await getStudentSession();
      if (!session) return unauthorizedResponse();
      const previewBlock = assertNotPreviewMode(session.mode);
      if (previewBlock) return previewBlock;

      const limited = await enforceRateLimit({
        key: `talent_story_submit:uid:${session.user.uid}`,
        limit: 5,
        windowSec: 3600,
      });
      if (!limited.allowed) {
        return rateLimitResponse(limited.retryAfterSec);
      }

      const idempotencyKey = readIdempotencyKey(request);
      if (idempotencyKey) {
        const cached = await getIdempotentResult<{
          body: unknown;
          status: number;
        }>({
          scope: "talent_story_submit",
          actorId: session.user.uid,
          key: idempotencyKey,
        });
        if (cached) {
          return NextResponse.json(cached.body, { status: cached.status });
        }
      }

      const studentSnap = await adminDb
        .collection("students")
        .doc(session.studentId)
        .get();
      const studentData = studentSnap.data() ?? {};
      if (
        !isPlacedStudent({
          status: session.student.status,
          benchStatus: String(studentData.benchStatus ?? ""),
        })
      ) {
        return NextResponse.json({ error: "not_placed" }, { status: 403 });
      }

      try {
        let quote = "";
        let corridor: string | undefined;
        let youtubeRaw: string | undefined;
        let displayName: string | undefined;
        let photoFile: File | null = null;

        const contentType = request.headers.get("content-type") ?? "";
        if (contentType.includes("multipart/form-data")) {
          const form = await request.formData();
          quote = String(form.get("quote") ?? "");
          corridor = String(form.get("corridor") ?? "").trim() || undefined;
          youtubeRaw =
            String(form.get("youtubeVideoId") ?? "").trim() || undefined;
          displayName =
            String(form.get("displayName") ?? "").trim() || undefined;
          const file = form.get("photo");
          if (isUploadFile(file)) photoFile = file;
        } else {
          const parsed = bodySchema.parse(await request.json());
          quote = parsed.quote;
          corridor = parsed.corridor;
          youtubeRaw = parsed.youtubeVideoId;
          displayName = parsed.displayName;
        }

        const parsedBody = bodySchema.parse({
          quote,
          corridor,
          youtubeVideoId: youtubeRaw,
          displayName,
        });

        let photo: StorageFileRef | null = null;
        if (photoFile) {
          if (!photoFile.type.startsWith("image/")) {
            return NextResponse.json(
              { error: "invalid_photo_type" },
              { status: 400 },
            );
          }
          if (photoFile.size <= 0 || photoFile.size > MAX_PHOTO_BYTES) {
            return NextResponse.json(
              { error: "invalid_photo_size" },
              { status: 400 },
            );
          }
          const filename = sanitizeUploadFilename(
            photoFile.name || "story.jpg",
          );
          const path = `talent-stories/${session.studentId}/${Date.now()}-${filename}`;
          const uploaded = await uploadFileViaAdmin({
            path,
            buffer: Buffer.from(await photoFile.arrayBuffer()),
            contentType: photoFile.type,
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
        }

        const youtubeVideoId =
          parseYoutubeVideoId(parsedBody.youtubeVideoId ?? "") ?? null;

        const ref = adminDb.collection("talent_stories").doc();
        const doc = stripUndefined({
          id: ref.id,
          studentId: session.studentId,
          quote: parsedBody.quote,
          photo,
          youtubeVideoId,
          corridor: parsedBody.corridor ?? null,
          displayName:
            parsedBody.displayName ||
            session.student.fullName ||
            session.user.displayName ||
            "Student",
          status: "pending" as const,
          publishedAt: null,
          reviewedBy: null,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        await ref.set(doc);
        revalidateAdminCollection("talent_stories");

        const body = { ok: true, id: ref.id, status: "pending" as const };
        if (idempotencyKey) {
          await saveIdempotentResult({
            scope: "talent_story_submit",
            actorId: session.user.uid,
            key: idempotencyKey,
            response: { body, status: 201 },
            status: 201,
          });
        }
        return NextResponse.json(body, { status: 201 });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json({ error: "invalid_body" }, { status: 400 });
        }
        console.error("talent_story_submit_failed", error);
        return NextResponse.json({ error: "submit_failed" }, { status: 500 });
      }
    },
  );
}
