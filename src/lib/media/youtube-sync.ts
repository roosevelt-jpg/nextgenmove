import {
  getIntegrationSecrets,
  isIntegrationConnected,
} from "@/lib/admin/integration-secrets";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { revalidateAdminCollection } from "@/lib/admin/revalidate";
import { stripUndefined } from "@/lib/stripUndefined";
import {
  formatYoutubeDuration,
  looksLikeGoogleApiKey,
  parseYoutubePlaylistId,
  parseYoutubeVideoId,
  resolveYoutubeChannel,
  youtubeWatchUrl,
} from "@/lib/media/youtube";

const DEFAULT_LIBRARY_LIMIT = 50;
const YOUTUBE_API = "https://www.googleapis.com/youtube/v3";
export const YOUTUBE_INTEGRATION_ID = "youtube";

async function resolveYoutubeApiKey(): Promise<string | null> {
  if (await isIntegrationConnected(YOUTUBE_INTEGRATION_ID)) {
    const secrets = await getIntegrationSecrets(YOUTUBE_INTEGRATION_ID);
    const fromSecret = secrets.apiKey?.trim();
    if (fromSecret) return fromSecret;
  }
  return process.env.YOUTUBE_API_KEY?.trim() || null;
}

export interface YoutubeSyncResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  upserted: number;
  archived: number;
  playlistId?: string;
  error?: string;
}

interface PlaylistItemSnippet {
  title?: string;
  description?: string;
  channelTitle?: string;
  position?: number;
  resourceId?: { videoId?: string };
  thumbnails?: {
    maxres?: { url?: string };
    standard?: { url?: string };
    high?: { url?: string };
    medium?: { url?: string };
    default?: { url?: string };
  };
}

function pickThumbnail(snippet: PlaylistItemSnippet): string {
  const t = snippet.thumbnails;
  return (
    t?.maxres?.url ||
    t?.standard?.url ||
    t?.high?.url ||
    t?.medium?.url ||
    t?.default?.url ||
    ""
  );
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`youtube_api_${res.status}:${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

async function listChannelVideosViaSearch(
  apiKey: string,
  channelId: string,
  maxItems: number,
): Promise<
  Array<{
    videoId: string;
    title: string;
    subtitle: string;
    thumbnailUrl: string;
    position: number;
  }>
> {
  const collected: Array<{
    videoId: string;
    title: string;
    subtitle: string;
    thumbnailUrl: string;
    position: number;
  }> = [];
  let pageToken = "";

  while (collected.length < maxItems) {
    const params = new URLSearchParams({
      part: "snippet",
      channelId,
      order: "date",
      type: "video",
      maxResults: String(Math.min(50, maxItems - collected.length)),
      key: apiKey,
    });
    if (pageToken) params.set("pageToken", pageToken);

    const data = await fetchJson<{
      nextPageToken?: string;
      items?: Array<{
        id?: { videoId?: string };
        snippet?: PlaylistItemSnippet & { channelTitle?: string };
      }>;
    }>(`${YOUTUBE_API}/search?${params}`);

    for (const item of data.items ?? []) {
      const videoId = item.id?.videoId;
      if (!videoId) continue;
      const snippet = item.snippet ?? {};
      collected.push({
        videoId,
        title: String(snippet.title ?? "").trim() || videoId,
        subtitle: String(snippet.channelTitle ?? "").trim(),
        thumbnailUrl: pickThumbnail(snippet),
        position: collected.length,
      });
      if (collected.length >= maxItems) break;
    }

    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }

  return collected;
}

function isPlaylistNotFoundError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  return (
    message.includes("youtube_api_404") ||
    lower.includes("playlistnotfound") ||
    (lower.includes("playlist") && lower.includes("cannot be found"))
  );
}

async function listPlaylistVideos(
  apiKey: string,
  playlistId: string,
  maxItems: number,
): Promise<
  Array<{
    videoId: string;
    title: string;
    subtitle: string;
    thumbnailUrl: string;
    position: number;
  }>
> {
  const collected: Array<{
    videoId: string;
    title: string;
    subtitle: string;
    thumbnailUrl: string;
    position: number;
  }> = [];
  let pageToken = "";

  while (collected.length < maxItems) {
    const params = new URLSearchParams({
      part: "snippet,contentDetails,status",
      playlistId,
      maxResults: String(Math.min(50, maxItems - collected.length)),
      key: apiKey,
    });
    if (pageToken) params.set("pageToken", pageToken);

    const data = await fetchJson<{
      nextPageToken?: string;
      items?: Array<{
        snippet?: PlaylistItemSnippet;
        contentDetails?: { videoId?: string };
        status?: { privacyStatus?: string };
      }>;
    }>(`${YOUTUBE_API}/playlistItems?${params}`);

    for (const item of data.items ?? []) {
      if (item.status?.privacyStatus === "private") continue;
      const videoId =
        item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
      if (!videoId) continue;
      const snippet = item.snippet ?? {};
      collected.push({
        videoId,
        title: String(snippet.title ?? "").trim() || videoId,
        subtitle: String(snippet.channelTitle ?? "").trim(),
        thumbnailUrl: pickThumbnail(snippet),
        position: Number(snippet.position ?? collected.length),
      });
      if (collected.length >= maxItems) break;
    }

    pageToken = data.nextPageToken ?? "";
    if (!pageToken) break;
  }

  return collected;
}

async function fetchDurations(
  apiKey: string,
  videoIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    if (!batch.length) continue;
    const params = new URLSearchParams({
      part: "contentDetails",
      id: batch.join(","),
      key: apiKey,
    });
    const data = await fetchJson<{
      items?: Array<{
        id?: string;
        contentDetails?: { duration?: string };
      }>;
    }>(`${YOUTUBE_API}/videos?${params}`);

    for (const item of data.items ?? []) {
      if (!item.id) continue;
      map.set(item.id, formatYoutubeDuration(item.contentDetails?.duration));
    }
  }
  return map;
}

async function fetchSingleVideo(
  apiKey: string,
  videoId: string,
): Promise<{
  videoId: string;
  title: string;
  subtitle: string;
  thumbnailUrl: string;
  duration: string;
} | null> {
  const params = new URLSearchParams({
    part: "snippet,contentDetails,status",
    id: videoId,
    key: apiKey,
  });
  const data = await fetchJson<{
    items?: Array<{
      id?: string;
      status?: { privacyStatus?: string; embeddable?: boolean };
      snippet?: PlaylistItemSnippet & { channelTitle?: string };
      contentDetails?: { duration?: string };
    }>;
  }>(`${YOUTUBE_API}/videos?${params}`);

  const item = data.items?.[0];
  if (!item?.id) return null;
  if (item.status?.privacyStatus === "private") return null;
  const snippet = item.snippet ?? {};
  return {
    videoId: item.id,
    title: String(snippet.title ?? "").trim() || item.id,
    subtitle: String(snippet.channelTitle ?? "").trim(),
    thumbnailUrl: pickThumbnail(snippet),
    duration: formatYoutubeDuration(item.contentDetails?.duration),
  };
}

export async function syncYoutubePlaylistVideos(): Promise<YoutubeSyncResult> {
  const settingsRef = adminDb.collection("site_settings").doc("default");
  const settingsSnap = await settingsRef.get();
  const settings = (settingsSnap.data() ?? {}) as Record<string, unknown>;

  const enabled = settings.youtubeSyncEnabled !== false;
  let playlistRaw = String(settings.youtubePlaylistUrl ?? "").trim();

  // Fall back to channel saved on Integrations → YouTube (set once at connect).
  if (!playlistRaw) {
    try {
      const ytSnap = await adminDb
        .collection("integrations")
        .doc(YOUTUBE_INTEGRATION_ID)
        .get();
      const channelUrl = String(ytSnap.data()?.config?.channelUrl ?? "").trim();
      if (channelUrl) {
        playlistRaw = channelUrl;
        await settingsRef.set(
          stripUndefined({
            youtubePlaylistUrl: channelUrl,
            updatedAt: FieldValue.serverTimestamp(),
          }),
          { merge: true },
        );
      }
    } catch {
      // Keep empty — missing_or_invalid_playlist below.
    }
  }

  const libraryLimit = Math.max(
    1,
    Number(settings.youtubeLibraryLimit ?? DEFAULT_LIBRARY_LIMIT) ||
      DEFAULT_LIBRARY_LIMIT,
  );

  if (!enabled) {
    return {
      ok: true,
      skipped: true,
      reason: "sync_disabled",
      upserted: 0,
      archived: 0,
    };
  }

  if (looksLikeGoogleApiKey(playlistRaw)) {
    const error = "playlist_looks_like_api_key";
    await settingsRef.set(
      stripUndefined({
        youtubeLastSyncError: error,
        youtubeLastSyncedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true },
    );
    return { ok: false, upserted: 0, archived: 0, error };
  }

  const apiKey = await resolveYoutubeApiKey();
  if (!apiKey) {
    const error = "missing_youtube_api_key";
    await settingsRef.set(
      stripUndefined({
        youtubeLastSyncError: error,
        youtubeLastSyncedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true },
    );
    return { ok: false, upserted: 0, archived: 0, error };
  }

  let playlistId = parseYoutubePlaylistId(playlistRaw);
  let channelId: string | null = null;

  if (!playlistId) {
    // Allow channel URL / @handle — resolve to channel + uploads playlist (UU…).
    try {
      const resolved = await resolveYoutubeChannel(apiKey, playlistRaw);
      channelId = resolved?.channelId ?? null;
      playlistId = resolved?.uploadsPlaylistId ?? null;
    } catch (err) {
      const error = err instanceof Error ? err.message : "sync_failed";
      await settingsRef.set(
        stripUndefined({
          youtubeLastSyncError: error,
          youtubeLastSyncedAt: FieldValue.serverTimestamp(),
        }),
        { merge: true },
      );
      return { ok: false, upserted: 0, archived: 0, error };
    }
  }

  // Single video / Shorts URL — upsert that card only (do not archive playlist syncs).
  const singleVideoId = !playlistId && !channelId ? parseYoutubeVideoId(playlistRaw) : null;
  if (singleVideoId) {
    try {
      const video = await fetchSingleVideo(apiKey, singleVideoId);
      if (!video) {
        const error = "video_not_found_or_private";
        await settingsRef.set(
          stripUndefined({
            youtubeLastSyncError: error,
            youtubeLastSyncedAt: FieldValue.serverTimestamp(),
          }),
          { merge: true },
        );
        return { ok: false, upserted: 0, archived: 0, error };
      }

      await adminDb
        .collection("video_cards")
        .doc(`yt_${video.videoId}`)
        .set(
          stripUndefined({
            title: video.title,
            subtitle: video.subtitle,
            videoUrl: youtubeWatchUrl(video.videoId),
            thumbnailUrl: video.thumbnailUrl,
            duration: video.duration,
            position: 1,
            status: "live",
            youtubeVideoId: video.videoId,
            source: "youtube_playlist",
            syncedAt: FieldValue.serverTimestamp(),
          }),
          { merge: true },
        );

      await settingsRef.set(
        stripUndefined({
          youtubeLastSyncedAt: FieldValue.serverTimestamp(),
          youtubeLastSyncError: null,
        }),
        { merge: true },
      );

      revalidateAdminCollection("video_cards");
      revalidateAdminCollection("site_settings");

      return {
        ok: true,
        upserted: 1,
        archived: 0,
        playlistId: `video:${video.videoId}`,
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : "sync_failed";
      await settingsRef.set(
        stripUndefined({
          youtubeLastSyncError: error,
          youtubeLastSyncedAt: FieldValue.serverTimestamp(),
        }),
        { merge: true },
      );
      return { ok: false, upserted: 0, archived: 0, error };
    }
  }

  if (!playlistId && !channelId) {
    const error = "missing_or_invalid_playlist";
    await settingsRef.set(
      stripUndefined({
        youtubeLastSyncError: error,
        youtubeLastSyncedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true },
    );
    return { ok: false, upserted: 0, archived: 0, error };
  }

  try {
    let items: Array<{
      videoId: string;
      title: string;
      subtitle: string;
      thumbnailUrl: string;
      position: number;
    }> = [];

    if (playlistId) {
      try {
        items = await listPlaylistVideos(apiKey, playlistId, libraryLimit);
      } catch (playlistError) {
        if (!isPlaylistNotFoundError(playlistError)) throw playlistError;
        // Uploads playlist 404 is a known YouTube API quirk — fall back to search.
        if (!channelId && /^UU[\w-]{8,}$/i.test(playlistId)) {
          channelId = `UC${playlistId.slice(2)}`;
        }
        if (!channelId) throw playlistError;
        items = await listChannelVideosViaSearch(
          apiKey,
          channelId,
          libraryLimit,
        );
      }
    } else if (channelId) {
      items = await listChannelVideosViaSearch(apiKey, channelId, libraryLimit);
    }

    const durations = await fetchDurations(
      apiKey,
      items.map((item) => item.videoId),
    );

    const liveIds = new Set<string>();
    let upserted = 0;

    for (const [index, item] of items.entries()) {
      const docId = `yt_${item.videoId}`;
      liveIds.add(docId);
      await adminDb
        .collection("video_cards")
        .doc(docId)
        .set(
          stripUndefined({
            title: item.title,
            subtitle: item.subtitle,
            videoUrl: youtubeWatchUrl(item.videoId),
            thumbnailUrl: item.thumbnailUrl,
            duration: durations.get(item.videoId) || "",
            position: index + 1,
            status: "live",
            youtubeVideoId: item.videoId,
            source: "youtube_playlist",
            syncedAt: FieldValue.serverTimestamp(),
          }),
          { merge: true },
        );
      upserted += 1;
    }

    const syncedSnap = await adminDb
      .collection("video_cards")
      .where("source", "==", "youtube_playlist")
      .get();

    let archived = 0;
    const batch = adminDb.batch();
    for (const doc of syncedSnap.docs) {
      if (liveIds.has(doc.id)) continue;
      if (doc.data().status === "archived") continue;
      batch.update(doc.ref, {
        status: "archived",
        syncedAt: FieldValue.serverTimestamp(),
      });
      archived += 1;
    }
    if (archived > 0) {
      await batch.commit();
    }

    await settingsRef.set(
      stripUndefined({
        youtubeLastSyncedAt: FieldValue.serverTimestamp(),
        youtubeLastSyncError: null,
      }),
      { merge: true },
    );

    revalidateAdminCollection("video_cards");
    revalidateAdminCollection("site_settings");

    return {
      ok: true,
      upserted,
      archived,
      playlistId: playlistId ?? undefined,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : "sync_failed";
    await settingsRef.set(
      stripUndefined({
        youtubeLastSyncError: error,
        youtubeLastSyncedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true },
    );
    return {
      ok: false,
      upserted: 0,
      archived: 0,
      error,
      playlistId: playlistId ?? undefined,
    };
  }
}
