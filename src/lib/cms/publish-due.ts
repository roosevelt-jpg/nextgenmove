import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { logger } from "@/lib/observability/logger";
import { stripUndefined } from "@/lib/stripUndefined";
import { isPublishAtLive, parsePublishAtMs } from "@/lib/cms/publish-visibility";

export const CMS_SCHEDULE_COLLECTIONS = [
  "cms_pages",
  "testimonials",
  "talent_stories",
] as const;

export type CmsScheduleCollection = (typeof CMS_SCHEDULE_COLLECTIONS)[number];

export type PublishDueCounts = Record<CmsScheduleCollection, number> & {
  total: number;
};

const PENDING_STATUSES = ["draft", "scheduled"] as const;

/**
 * Flip draft/scheduled CMS docs whose publishAt is due to published + publishedAt.
 * Public loaders still filter via isPubliclyPublished (status + publishAt).
 */
export async function publishDueCmsDocuments(
  limitPerCollection = 100,
): Promise<PublishDueCounts> {
  const nowMs = Date.now();
  const counts = {
    cms_pages: 0,
    testimonials: 0,
    talent_stories: 0,
    total: 0,
  } satisfies PublishDueCounts;

  for (const collection of CMS_SCHEDULE_COLLECTIONS) {
    const flipped = await publishDueInCollection(
      collection,
      limitPerCollection,
      nowMs,
    );
    counts[collection] = flipped;
    counts.total += flipped;
  }

  logger.info("cms_publish_due_complete", {
    cms_pages: counts.cms_pages,
    testimonials: counts.testimonials,
    talent_stories: counts.talent_stories,
    total: counts.total,
  });

  return counts;
}

async function publishDueInCollection(
  collection: CmsScheduleCollection,
  limit: number,
  nowMs: number,
): Promise<number> {
  let snap;
  try {
    snap = await adminDb
      .collection(collection)
      .where("status", "in", [...PENDING_STATUSES])
      .limit(Math.max(1, limit))
      .get();
  } catch {
    // Fallback when `in` query needs an index still building.
    const [draftSnap, scheduledSnap] = await Promise.all([
      adminDb
        .collection(collection)
        .where("status", "==", "draft")
        .limit(Math.max(1, limit))
        .get(),
      adminDb
        .collection(collection)
        .where("status", "==", "scheduled")
        .limit(Math.max(1, limit))
        .get(),
    ]);
    const seen = new Set<string>();
    const docs = [...draftSnap.docs, ...scheduledSnap.docs].filter((doc) => {
      if (seen.has(doc.id)) return false;
      seen.add(doc.id);
      return true;
    });
    return await commitDueDocs(collection, docs, nowMs);
  }

  return await commitDueDocs(collection, snap.docs, nowMs);
}

async function commitDueDocs(
  collection: CmsScheduleCollection,
  docs: FirebaseFirestore.QueryDocumentSnapshot[],
  nowMs: number,
): Promise<number> {
  const due = docs.filter((doc) => {
    const data = doc.data();
    const status = String(data.status ?? "");
    if (status !== "draft" && status !== "scheduled") return false;
    // Require an explicit schedule; bare drafts stay draft until admin publishes.
    if (parsePublishAtMs(data.publishAt) == null) return false;
    return isPublishAtLive(data.publishAt, nowMs);
  });

  if (due.length === 0) return 0;

  const batch = adminDb.batch();
  for (const doc of due) {
    batch.set(
      doc.ref,
      stripUndefined({
        status: "published",
        publishedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true },
    );
  }
  await batch.commit();

  logger.info("cms_publish_due_collection", {
    collection,
    flipped: due.length,
  });

  return due.length;
}
