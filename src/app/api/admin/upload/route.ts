import { NextResponse } from "next/server";
import { getAdminSession, unauthorizedResponse } from "@/lib/admin/session";
import {
  sanitizeUploadFilename,
  uploadFileViaAdmin,
} from "@/lib/storage/upload-via-admin";

export const dynamic = "force-dynamic";

const MAX_BYTES = 15 * 1024 * 1024;

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

/** Keep only safe path segments (no traversal, no odd characters). */
function sanitizePathPrefix(raw: string): string {
  const segments = String(raw)
    .split("/")
    .map((segment) => segment.trim().replace(/[^a-zA-Z0-9._-]/g, "_"))
    .filter((segment) => segment && segment !== "." && segment !== "..");
  return segments.slice(0, 6).join("/") || "admin/uploads";
}

export async function POST(request: Request) {
  const session = await getAdminSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const bucketName =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    process.env.FIREBASE_STORAGE_BUCKET ||
    "";

  if (!bucketName) {
    console.error("admin_upload_missing_bucket");
    return NextResponse.json(
      { error: "storage_not_configured" },
      { status: 503 },
    );
  }

  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!isUploadFile(file)) {
      return NextResponse.json({ error: "missing_file" }, { status: 400 });
    }

    if (file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json({ error: "invalid_file_size" }, { status: 400 });
    }

    const prefix = sanitizePathPrefix(String(form.get("path") ?? ""));
    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = sanitizeUploadFilename(String(file.name || "file"));
    const path = `${prefix}/${Date.now()}-${filename}`;

    const result = await uploadFileViaAdmin({
      path,
      buffer,
      contentType: String(file.type || "application/octet-stream"),
      filename,
      bucketName,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("admin_upload_failed", message);
    if (message.includes("bucket") || message.includes("STORAGE")) {
      return NextResponse.json(
        { error: "storage_not_configured" },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }
}
