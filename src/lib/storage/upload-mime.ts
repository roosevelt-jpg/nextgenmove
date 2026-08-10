/**
 * Shared MIME allow-lists and HTML `accept` strings for uploads across
 * admin, student, employer, account, and public surfaces.
 */

export const IMAGE_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export const DOCUMENT_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export const VIDEO_MIME = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

export const AUDIO_MIME = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/aac",
  "audio/webm",
]);

/** 15 MB — default for student/employer/account/admin non-media uploads. */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

/** 10 MB — public / anonymous inbound uploads. */
export const MAX_PUBLIC_UPLOAD_BYTES = 10 * 1024 * 1024;

/** 100 MB — admin/student video (and admin audio) uploads. */
export const MAX_VIDEO_UPLOAD_BYTES = 100 * 1024 * 1024;

export function normalizeMime(type: string): string {
  const raw = String(type || "")
    .trim()
    .toLowerCase();
  if (raw === "image/jpg") return "image/jpeg";
  if (raw === "audio/mp3") return "audio/mpeg";
  return raw;
}

export function isAllowedMime(
  type: string,
  ...sets: ReadonlyArray<ReadonlySet<string>>
): boolean {
  const normalized = normalizeMime(type);
  if (!normalized) return false;
  return sets.some((set) => set.has(normalized) || set.has(type));
}

export function isImageMime(type: string): boolean {
  return isAllowedMime(type, IMAGE_MIME);
}

export function isDocumentMime(type: string): boolean {
  return isAllowedMime(type, DOCUMENT_MIME);
}

export function isVideoMime(type: string): boolean {
  return isAllowedMime(type, VIDEO_MIME);
}

export function isAudioMime(type: string): boolean {
  return isAllowedMime(type, AUDIO_MIME);
}

export function isDocumentOrImageMime(type: string): boolean {
  return isAllowedMime(type, DOCUMENT_MIME, IMAGE_MIME);
}

export function isMediaMime(type: string): boolean {
  return isAllowedMime(type, DOCUMENT_MIME, IMAGE_MIME, VIDEO_MIME);
}

export function isAdminUploadMime(type: string): boolean {
  return isAllowedMime(type, DOCUMENT_MIME, IMAGE_MIME, VIDEO_MIME, AUDIO_MIME);
}

/** Max bytes for a given content type (video/audio get the larger cap). */
export function maxBytesForMime(
  type: string,
  options?: { publicUpload?: boolean; allowVideo?: boolean },
): number {
  if (options?.publicUpload) return MAX_PUBLIC_UPLOAD_BYTES;
  if (
    options?.allowVideo !== false &&
    (isVideoMime(type) || isAudioMime(type))
  ) {
    return MAX_VIDEO_UPLOAD_BYTES;
  }
  return MAX_UPLOAD_BYTES;
}

export const ACCEPT_DOCUMENTS =
  ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export const ACCEPT_IMAGES =
  ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";

export const ACCEPT_DOCUMENTS_AND_IMAGES = `${ACCEPT_DOCUMENTS},${ACCEPT_IMAGES}`;

export const ACCEPT_VIDEOS =
  ".mp4,.webm,.mov,video/mp4,video/webm,video/quicktime";

export const ACCEPT_AUDIO =
  ".mp3,.wav,.aac,.weba,audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/aac,audio/webm";

export const ACCEPT_MEDIA = `${ACCEPT_DOCUMENTS_AND_IMAGES},${ACCEPT_VIDEOS}`;

export const ACCEPT_ADMIN = `${ACCEPT_MEDIA},${ACCEPT_AUDIO}`;
