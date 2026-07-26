import { randomUUID } from "crypto";
import { adminStorage } from "@/lib/firebase-admin";

export interface AdminUploadResult {
  url: string;
  path: string;
  filename: string;
  size: number;
  mimeType: string;
}

let resolvedBucketName: string | null = null;

/**
 * Find a bucket that actually exists. Configured names can go stale
 * (e.g. legacy `<project>.appspot.com` vs modern `<project>.firebasestorage.app`),
 * so probe candidates once and cache the winner for the process lifetime.
 */
export async function resolveStorageBucketName(
  preferred?: string,
): Promise<string> {
  if (resolvedBucketName) return resolvedBucketName;

  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "";

  const candidates = [
    preferred?.trim(),
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim(),
    process.env.FIREBASE_STORAGE_BUCKET?.trim(),
    projectId ? `${projectId}.firebasestorage.app` : undefined,
    projectId ? `${projectId}.appspot.com` : undefined,
  ].filter((name, index, list): name is string =>
    Boolean(name) && list.indexOf(name) === index,
  );

  for (const name of candidates) {
    try {
      const [exists] = await adminStorage.bucket(name).exists();
      if (exists) {
        resolvedBucketName = name;
        return name;
      }
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error("storage_bucket_missing");
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
  const bucketName = await resolveStorageBucketName(options.bucketName);
  const bucket = adminStorage.bucket(bucketName);

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
