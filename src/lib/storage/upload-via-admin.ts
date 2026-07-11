import { randomUUID } from "crypto";
import { adminStorage } from "@/lib/firebase-admin";

export interface AdminUploadResult {
  url: string;
  path: string;
  filename: string;
  size: number;
  mimeType: string;
}

/**
 * Upload a buffer to Firebase Storage via Admin SDK and return a download URL
 * with a Firebase download token (readable under public-read rules).
 */
export async function uploadFileViaAdmin(options: {
  path: string;
  buffer: Buffer;
  contentType: string;
  filename: string;
  bucketName?: string;
}): Promise<AdminUploadResult> {
  const bucket = options.bucketName
    ? adminStorage.bucket(options.bucketName)
    : adminStorage.bucket();

  if (!bucket.name) {
    throw new Error("storage_bucket_missing");
  }

  const file = bucket.file(options.path);
  const token = randomUUID();

  await file.save(options.buffer, {
    resumable: false,
    metadata: {
      contentType: options.contentType || "application/octet-stream",
      metadata: {
        firebaseStorageDownloadTokens: token,
        originalName: options.filename,
      },
    },
  });

  const encodedPath = encodeURIComponent(options.path);
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${token}`;

  return {
    url,
    path: options.path,
    filename: options.filename,
    size: options.buffer.length,
    mimeType: options.contentType || "application/octet-stream",
  };
}

export function sanitizeUploadFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() || "file";
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file";
}
