import { NextResponse } from "next/server";
import { getStudentSession, unauthorizedResponse } from "@/lib/student/session";
import { assertNotPreviewMode } from "@/lib/auth/portal-session";
import {
  sanitizeUploadFilename,
  uploadFileViaAdmin,
} from "@/lib/storage/upload-via-admin";

export const dynamic = "force-dynamic";

const MAX_BYTES = 15 * 1024 * 1024;

const ALLOWED_CV_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

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

export async function POST(request: Request) {
  const session = await getStudentSession();
  if (!session) return unauthorizedResponse();

  const previewBlock = assertNotPreviewMode(session.mode);
  if (previewBlock) return previewBlock;

  const bucketName =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    process.env.FIREBASE_STORAGE_BUCKET ||
    "";

  if (!bucketName) {
    return NextResponse.json({ error: "storage_not_configured" }, { status: 503 });
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    const kindHint = String(form.get("kind") || "");

    if (!isUploadFile(file)) {
      return NextResponse.json({ error: "missing_file" }, { status: 400 });
    }

    const contentType = String(file.type || "");
    const kind =
      kindHint === "cv" || kindHint === "photo"
        ? kindHint
        : contentType.startsWith("image/")
          ? "photo"
          : "cv";

    if (kind === "cv") {
      if (!ALLOWED_CV_TYPES.has(contentType)) {
        return NextResponse.json({ error: "invalid_file_type" }, { status: 400 });
      }
    } else if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "invalid_file_type" }, { status: 400 });
    }

    if (file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json({ error: "invalid_file_size" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = sanitizeUploadFilename(
      String(file.name || (kind === "cv" ? "cv.pdf" : "photo.jpg")),
    );
    const path = `students/${session.studentId}/${kind}/${Date.now()}-${filename}`;

    const result = await uploadFileViaAdmin({
      path,
      buffer,
      contentType,
      filename,
      bucketName,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("student_upload_failed", error);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }
}
