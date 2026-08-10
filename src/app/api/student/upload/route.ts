import { NextResponse } from "next/server";
import { getStudentSession, unauthorizedResponse } from "@/lib/student/session";
import { assertNotPreviewMode } from "@/lib/auth/portal-session";
import {
  sanitizeUploadFilename,
  uploadFileViaAdmin,
} from "@/lib/storage/upload-via-admin";
import {
  DOCUMENT_MIME,
  IMAGE_MIME,
  VIDEO_MIME,
  isAllowedMime,
  isImageMime,
  isVideoMime,
  maxBytesForMime,
} from "@/lib/storage/upload-mime";

export const dynamic = "force-dynamic";

const STUDENT_KINDS = [
  "cv",
  "photo",
  "document",
  "sprint_deliverable",
  "video",
] as const;
type StudentUploadKind = (typeof STUDENT_KINDS)[number];

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

function isStudentKind(value: string): value is StudentUploadKind {
  return (STUDENT_KINDS as readonly string[]).includes(value);
}

export async function POST(request: Request) {
  const session = await getStudentSession();
  if (!session) return unauthorizedResponse();

  const previewBlock = assertNotPreviewMode(session.mode);
  if (previewBlock) return previewBlock;

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!isUploadFile(file)) {
      return NextResponse.json({ error: "missing_file" }, { status: 400 });
    }
    const kindHint = String(form.get("kind") || "");
    const contentType = String(file.type || "");
    const kind: StudentUploadKind = isStudentKind(kindHint)
      ? kindHint
      : isImageMime(contentType)
        ? "photo"
        : "cv";

    if (kind === "photo") {
      if (!isAllowedMime(contentType, IMAGE_MIME)) {
        return NextResponse.json({ error: "invalid_file_type" }, { status: 400 });
      }
    } else if (kind === "cv") {
      if (!isAllowedMime(contentType, DOCUMENT_MIME)) {
        return NextResponse.json({ error: "invalid_file_type" }, { status: 400 });
      }
    } else if (kind === "document") {
      if (!isAllowedMime(contentType, DOCUMENT_MIME, IMAGE_MIME)) {
        return NextResponse.json({ error: "invalid_file_type" }, { status: 400 });
      }
    } else if (kind === "video") {
      if (!isAllowedMime(contentType, VIDEO_MIME)) {
        return NextResponse.json({ error: "invalid_file_type" }, { status: 400 });
      }
    } else if (kind === "sprint_deliverable") {
      if (!isAllowedMime(contentType, DOCUMENT_MIME, IMAGE_MIME, VIDEO_MIME)) {
        return NextResponse.json({ error: "invalid_file_type" }, { status: 400 });
      }
    }

    const maxBytes = maxBytesForMime(contentType, {
      allowVideo: kind === "video" || kind === "sprint_deliverable",
    });
    if (file.size <= 0 || file.size > maxBytes) {
      return NextResponse.json({ error: "invalid_file_size" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const defaultName =
      kind === "photo"
        ? "photo.jpg"
        : kind === "document"
          ? "evidence.pdf"
          : kind === "sprint_deliverable"
            ? isVideoMime(contentType)
              ? "sprint-deliverable.mp4"
              : "sprint-deliverable.pdf"
            : kind === "video"
              ? "video.mp4"
              : "cv.pdf";
    const filename = sanitizeUploadFilename(String(file.name || defaultName));
    const pathSegment =
      kind === "sprint_deliverable" ? "sprint" : kind;
    const path = `students/${session.studentId}/${pathSegment}/${Date.now()}-${filename}`;

    const result = await uploadFileViaAdmin({
      path,
      buffer,
      contentType,
      filename,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("student_upload_failed", error);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }
}
