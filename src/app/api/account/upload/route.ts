import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
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

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const bucketName =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    process.env.FIREBASE_STORAGE_BUCKET ||
    "";

  if (!bucketName) {
    console.error("account_upload_missing_bucket");
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

    const contentType = String(file.type || "");
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "invalid_file_type" }, { status: 400 });
    }

    if (file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json({ error: "invalid_file_size" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = sanitizeUploadFilename(String(file.name || "photo.jpg"));
    const path = `users/${user.uid}/photo/${Date.now()}-${filename}`;

    const result = await uploadFileViaAdmin({
      path,
      buffer,
      contentType,
      filename,
      bucketName,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("account_upload_failed", message);
    if (message.includes("bucket") || message.includes("STORAGE")) {
      return NextResponse.json(
        { error: "storage_not_configured" },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }
}
