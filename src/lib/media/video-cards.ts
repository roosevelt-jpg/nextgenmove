import { adminDb } from "@/lib/firebase-admin";
import type { VideoCardDocument } from "@/types/cms";

export async function listLiveVideoCards(
  limit?: number,
): Promise<VideoCardDocument[]> {
  const snapshot = await adminDb
    .collection("video_cards")
    .where("status", "==", "live")
    .get();

  const items = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      title: String(data.title ?? ""),
      subtitle: String(data.subtitle ?? ""),
      videoUrl: String(data.videoUrl ?? ""),
      duration: String(data.duration ?? ""),
      thumbnailUrl: String(data.thumbnailUrl ?? ""),
      position: Number(data.position ?? 0),
      status: (data.status as VideoCardDocument["status"]) ?? "draft",
      youtubeVideoId: data.youtubeVideoId
        ? String(data.youtubeVideoId)
        : undefined,
      source: data.source as VideoCardDocument["source"] | undefined,
      syncedAt: data.syncedAt ? String(data.syncedAt) : null,
    } satisfies VideoCardDocument;
  });

  items.sort((a, b) => a.position - b.position);
  if (typeof limit === "number" && limit > 0) {
    return items.slice(0, limit);
  }
  return items;
}
