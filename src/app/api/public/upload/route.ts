import { NextResponse } from "next/server";
import {
  clientIpFromRequest,
  enforceRateLimit,
  rateLimitResponse,
} from "@/lib/security/rate-limit";
import {
  sanitizeUploadFilename,
  uploadFileViaAdmin,
} from "@/lib/storage/upload-via-admin";
import {
  DOCUMENT_MIME,
  MAX_PUBLIC_UPLOAD_BYTES,
  isAllowedMime,
} from "@/lib/storage/upload-mime";

export const dynamic = "force-dynamic";

/** Public visitors may only upload documents into these prefixes. */
const ALLOWED_PREFIXES = [
  "careers/applications",
  "requests/sourcing",
  "roles/interest",
];

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

function sanitizePathPrefix(raw: string): string | null {
  const segments = String(raw)
    .split("/")
    .map((segment) => segment.trim().replace(/[^a-zA-Z0-9._-]/g, "_"))
    .filter((segment) => segment && segment !== "." && segment !== "..");
  const path = segments.slice(0, 4).join("/");
  const allowed = ALLOWED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
  return allowed ? path : null;
}

export async function POST(request: Request) {
  const ip = clientIpFromRequest(request);
  const limit = await enforceRateLimit({
    key: `public:upload:ip:${ip}`,
    limit: 10,
    windowSec: 600,
  });

  if (!limit.allowed) {
    return rateLimitResponse(limit.retryAfterSec);
  }

  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!isUploadFile(file)) {
      return NextResponse.json({ error: "missing_file" }, { status: 400 });
    }

    const contentType = String(file.type || "");
    if (!isAllowedMime(contentType, DOCUMENT_MIME)) {
      return NextResponse.json({ error: "invalid_file_type" }, { status: 400 });
    }

    if (file.size <= 0 || file.size > MAX_PUBLIC_UPLOAD_BYTES) {
      return NextResponse.json({ error: "invalid_file_size" }, { status: 400 });
    }

    const prefix = sanitizePathPrefix(String(form.get("path") ?? ""));
    if (!prefix) {
      return NextResponse.json({ error: "invalid_path" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = sanitizeUploadFilename(String(file.name || "document.pdf"));
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
    console.error("public_upload_failed", message);
    if (message.includes("storage_bucket_missing")) {
      return NextResponse.json(
        { error: "storage_not_configured" },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }
}
