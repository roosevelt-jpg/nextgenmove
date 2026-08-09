import { cache } from "react";
import { adminDb } from "@/lib/firebase-admin";
import { serializeForClient, serializeTimestamp } from "@/lib/firestore-utils";
import { resolveStorageFileRef } from "@/lib/storage/file-ref";
import { isPubliclyPublished } from "@/lib/cms/publish-visibility";
import type { TalentStoryDocument } from "@/types/cms";

function mapTalentStory(
  id: string,
  data: FirebaseFirestore.DocumentData,
): TalentStoryDocument {
  return serializeForClient({
    id,
    studentId: String(data.studentId ?? ""),
    quote: String(data.quote ?? ""),
    photo: resolveStorageFileRef(data.photo),
    youtubeVideoId: data.youtubeVideoId ? String(data.youtubeVideoId) : null,
    corridor: data.corridor ? String(data.corridor) : null,
    tags: Array.isArray(data.tags)
      ? data.tags.map((tag: unknown) => String(tag)).filter(Boolean)
      : undefined,
    displayName: data.displayName ? String(data.displayName) : undefined,
    status:
      data.status === "published" || data.status === "rejected"
        ? data.status
        : "pending",
    publishAt:
      serializeTimestamp(data.publishAt) ??
      (data.publishAt ? String(data.publishAt) : null),
    createdAt: serializeTimestamp(data.createdAt) ?? null,
    updatedAt: serializeTimestamp(data.updatedAt) ?? null,
    publishedAt: serializeTimestamp(data.publishedAt) ?? null,
    updatedBy: data.updatedBy ? String(data.updatedBy) : null,
    reviewedBy: data.reviewedBy ? String(data.reviewedBy) : null,
  }) as TalentStoryDocument;
}

async function loadPublishedTalentStories(
  limit = 24,
): Promise<TalentStoryDocument[]> {
  const snapshot = await adminDb
    .collection("talent_stories")
    .where("status", "==", "published")
    .orderBy("createdAt", "desc")
    .limit(Math.max(limit * 2, limit))
    .get();

  return snapshot.docs
    .map((doc) => mapTalentStory(doc.id, doc.data()))
    .filter((item) => isPubliclyPublished(item))
    .slice(0, limit);
}

export const getPublishedTalentStories = cache(async (limit = 24) => {
  try {
    return await loadPublishedTalentStories(limit);
  } catch {
    try {
      const snapshot = await adminDb
        .collection("talent_stories")
        .where("status", "==", "published")
        .limit(Math.max(limit * 2, limit))
        .get();
      const items = snapshot.docs
        .map((doc) => mapTalentStory(doc.id, doc.data()))
        .filter((item) => isPubliclyPublished(item));
      return items
        .sort((a, b) =>
          String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")),
        )
        .slice(0, limit);
    } catch {
      return [];
    }
  }
});
