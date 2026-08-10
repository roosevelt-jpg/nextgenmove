import { NextResponse } from "next/server";
import { getAdminSession, unauthorizedResponse } from "@/lib/admin/session";
import {
  sanitizeUploadFilename,
  uploadFileViaAdmin,
} from "@/lib/storage/upload-via-admin";
import {
  isAdminUploadMime,
  maxBytesForMime,
} from "@/lib/storage/upload-mime";

export const dynamic = "force-dynamic";

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

  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!isUploadFile(file)) {
      return NextResponse.json({ error: "missing_file" }, { status: 400 });
    }

    const contentType = String(file.type || "application/octet-stream");
    if (!isAdminUploadMime(contentType)) {
      return NextResponse.json({ error: "invalid_file_type" }, { status: 400 });
    }

    const maxBytes = maxBytesForMime(contentType, { allowVideo: true });
    if (file.size <= 0 || file.size > maxBytes) {
      return NextResponse.json({ error: "invalid_file_size" }, { status: 400 });
    }

    const prefix = sanitizePathPrefix(String(form.get("path") ?? ""));
    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = sanitizeUploadFilename(String(file.name || "file"));
    const path = `${prefix}/${Date.now()}-${filename}`;

    const result = await uploadFileViaAdmin({
      path,
      buffer,
      contentType,
      filename,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("admin_upload_failed", message);
    if (message.includes("storage_bucket_missing")) {
      return NextResponse.json(
        { error: "storage_not_configured" },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }
}
