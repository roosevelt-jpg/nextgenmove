import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  sanitizeUploadFilename,
  uploadFileViaAdmin,
} from "@/lib/storage/upload-via-admin";

export const dynamic = "force-dynamic";

const MAX_BYTES = 15 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "missing_file" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "invalid_file_type" }, { status: 400 });
    }

    if (file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json({ error: "invalid_file_size" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = sanitizeUploadFilename(file.name);
    const path = `users/${user.uid}/photo/${Date.now()}-${filename}`;

    const result = await uploadFileViaAdmin({
      path,
      buffer,
      contentType: file.type,
      filename,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("account_upload_failed", error);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }
}
