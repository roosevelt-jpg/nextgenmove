import { cache } from "react";
import { adminDb } from "@/lib/firebase-admin";
import { serializeForClient, serializeTimestamp } from "@/lib/firestore-utils";
import { resolveStorageFileRef } from "@/lib/storage/file-ref";
import type { TestimonialDocument } from "@/types/cms";

function mapTestimonial(
  id: string,
  data: FirebaseFirestore.DocumentData,
): TestimonialDocument {
  const rating = Number(data.rating ?? 0);
  return serializeForClient({
    id,
    authorUid: String(data.authorUid ?? ""),
    authorRole: data.authorRole === "company" ? "company" : "student",
    displayName: String(data.displayName ?? ""),
    roleLabel: String(data.roleLabel ?? ""),
    quote: String(data.quote ?? ""),
    rating: Number.isFinite(rating) ? Math.min(5, Math.max(1, Math.round(rating))) : 5,
    photo: resolveStorageFileRef(data.photo),
    status:
      data.status === "published" || data.status === "rejected"
        ? data.status
        : "pending",
    createdAt: serializeTimestamp(data.createdAt) ?? null,
    updatedAt: serializeTimestamp(data.updatedAt) ?? null,
    publishedAt: serializeTimestamp(data.publishedAt) ?? null,
    reviewedBy: data.reviewedBy ? String(data.reviewedBy) : null,
  }) as TestimonialDocument;
}

async function loadPublishedTestimonials(
  limit = 24,
): Promise<TestimonialDocument[]> {
  const snapshot = await adminDb
    .collection("testimonials")
    .where("status", "==", "published")
    .orderBy("publishedAt", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => mapTestimonial(doc.id, doc.data()));
}

export const getPublishedTestimonials = cache(async () => {
  try {
    return await loadPublishedTestimonials(24);
  } catch {
    // Index may still be building — fall back to unordered filter.
    try {
      const snapshot = await adminDb
        .collection("testimonials")
        .where("status", "==", "published")
        .limit(24)
        .get();
      const items = snapshot.docs.map((doc) => mapTestimonial(doc.id, doc.data()));
      return items.sort((a, b) =>
        String(b.publishedAt ?? b.createdAt ?? "").localeCompare(
          String(a.publishedAt ?? a.createdAt ?? ""),
        ),
      );
    } catch {
      return [];
    }
  }
});
