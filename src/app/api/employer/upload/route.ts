import { NextResponse } from "next/server";
import {
  getEmployerSession,
  unauthorizedResponse,
} from "@/lib/employer/session";
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

const EMPLOYER_KINDS = [
  "logo",
  "requirements",
  "jd",
  "sprint_deliverable",
] as const;
type EmployerUploadKind = (typeof EMPLOYER_KINDS)[number];

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

function isEmployerKind(value: string): value is EmployerUploadKind {
  return (EMPLOYER_KINDS as readonly string[]).includes(value);
}

export async function POST(request: Request) {
  const session = await getEmployerSession();
  if (!session) return unauthorizedResponse();

  const previewBlock = assertNotPreviewMode(session.mode);
  if (previewBlock) return previewBlock;

  try {
    const form = await request.formData();
    const file = form.get("file");
    const kindHint = String(form.get("kind") || "");

    if (!isUploadFile(file)) {
      return NextResponse.json({ error: "missing_file" }, { status: 400 });
    }

    const contentType = String(file.type || "");
    const kind: EmployerUploadKind = isEmployerKind(kindHint)
      ? kindHint
      : isImageMime(contentType)
        ? "logo"
        : "requirements";

    if (kind === "logo") {
      if (!isAllowedMime(contentType, IMAGE_MIME)) {
        return NextResponse.json({ error: "invalid_file_type" }, { status: 400 });
      }
    } else if (kind === "requirements" || kind === "jd") {
      if (!isAllowedMime(contentType, DOCUMENT_MIME, IMAGE_MIME)) {
        return NextResponse.json({ error: "invalid_file_type" }, { status: 400 });
      }
    } else if (kind === "sprint_deliverable") {
      if (!isAllowedMime(contentType, DOCUMENT_MIME, IMAGE_MIME, VIDEO_MIME)) {
        return NextResponse.json({ error: "invalid_file_type" }, { status: 400 });
      }
    }

    const maxBytes = maxBytesForMime(contentType, {
      allowVideo: kind === "sprint_deliverable",
    });
    if (file.size <= 0 || file.size > maxBytes) {
      return NextResponse.json({ error: "invalid_file_size" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const defaultName =
      kind === "logo"
        ? "logo.png"
        : kind === "sprint_deliverable"
          ? isVideoMime(contentType)
            ? "sprint-deliverable.mp4"
            : "sprint-deliverable.pdf"
          : kind === "jd"
            ? "job-description.pdf"
            : "requirement.pdf";
    const filename = sanitizeUploadFilename(String(file.name || defaultName));
    const path = `companies/${session.companyId}/${kind}/${Date.now()}-${filename}`;

    const result = await uploadFileViaAdmin({
      path,
      buffer,
      contentType,
      filename,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("employer_upload_failed", error);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }
}
