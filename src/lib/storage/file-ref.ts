/**
 * Resolve a Firestore file/image field that may be either a legacy URL string
 * or the canonical Storage metadata object.
 */
export type StorageFileRef = {
  url: string;
  path: string;
  filename: string;
  size: number | null;
  mimeType: string;
  uploadedAt: string | null;
};

export function resolveStorageFileRef(
  raw: unknown,
): StorageFileRef | null {
  if (raw == null || raw === "") return null;

  if (typeof raw === "string") {
    const url = raw.trim();
    if (!url) return null;
    return {
      url,
      path: "",
      filename: url.split("/").pop()?.split("?")[0] || "download",
      size: null,
      mimeType: "",
      uploadedAt: null,
    };
  }

  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const url = typeof obj.url === "string" ? obj.url.trim() : "";
    const path = typeof obj.path === "string" ? obj.path.trim() : "";
    if (!url && !path) return null;
    return {
      url,
      path,
      filename:
        typeof obj.filename === "string" && obj.filename.trim()
          ? obj.filename.trim()
          : path.split("/").pop() || "download",
      size: typeof obj.size === "number" ? obj.size : null,
      mimeType: typeof obj.mimeType === "string" ? obj.mimeType : "",
      uploadedAt:
        typeof obj.uploadedAt === "string" ? obj.uploadedAt : null,
    };
  }

  return null;
}

/** Extract Firebase Storage object path from a download URL or gs:// URI. */
export function storagePathFromDownloadUrl(url: string): string | null {
  try {
    if (url.startsWith("gs://")) {
      const withoutScheme = url.slice("gs://".length);
      const slashIndex = withoutScheme.indexOf("/");
      return slashIndex >= 0 ? withoutScheme.slice(slashIndex + 1) : null;
    }

    const parsed = new URL(url);
    const objectMatch = parsed.pathname.match(/\/o\/(.+)$/);
    if (!objectMatch?.[1]) return null;
    return decodeURIComponent(objectMatch[1]);
  } catch {
    return null;
  }
}

export function resolveStorageObjectPath(
  ref: StorageFileRef,
): string | null {
  if (ref.path) return ref.path;
  if (ref.url) return storagePathFromDownloadUrl(ref.url);
  return null;
}

/** URL string for img src / Open Graph — handles legacy strings and metadata objects. */
export function resolveStorageUrl(raw: unknown): string {
  return resolveStorageFileRef(raw)?.url ?? "";
}
