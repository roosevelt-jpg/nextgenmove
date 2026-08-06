const VIDEO_ID_RE = /^[\w-]{6,}$/;
/** Common YouTube playlist id prefixes (uploads, liked, mixes, etc.). */
const PLAYLIST_PREFIX_RE = /^(PL|UU|LL|OL|RD|FL|WL)[\w-]{8,}$/i;
/** Google API keys must never be treated as playlist ids. */
const GOOGLE_API_KEY_RE = /^A[Il]zaSy[\w-]{20,}$/i;

/** True when the value looks like a Google API key (often pasted into the wrong field). */
export function looksLikeGoogleApiKey(value: string | null | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  return GOOGLE_API_KEY_RE.test(trimmed) || /^AIza[\w-]{20,}$/i.test(trimmed);
}

/** Extract a YouTube video id from common URL shapes. */
export function parseYoutubeVideoId(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (VIDEO_ID_RE.test(trimmed) && !trimmed.startsWith("PL") && !trimmed.startsWith("UU")) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id && VIDEO_ID_RE.test(id) ? id : null;
    }

    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      if (parsed.pathname === "/watch") {
        const id = parsed.searchParams.get("v");
        return id && VIDEO_ID_RE.test(id) ? id : null;
      }
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (
        (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") &&
        parts[1] &&
        VIDEO_ID_RE.test(parts[1])
      ) {
        return parts[1];
      }
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * True when the value looks like a playlist, channel URL, @handle, or channel id.
 * Used for client-side save validation — actual resolution happens server-side.
 */
export function isYoutubePlaylistOrChannelInput(
  value: string | null | undefined,
): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed || looksLikeGoogleApiKey(trimmed)) return false;
  if (parseYoutubePlaylistId(trimmed)) return true;
  if (trimmed.startsWith("@")) return true;
  if (/^UC[\w-]{8,}$/i.test(trimmed)) return true;
  if (/^UU[\w-]{8,}$/i.test(trimmed)) return true;
  if (trimmed.includes("youtube.com") || trimmed.includes("youtu.be")) {
    return true;
  }
  return false;
}

/** Resolve a playlist id from a playlist URL or raw id. */
export function parseYoutubePlaylistId(
  urlOrId: string | null | undefined,
): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  if (!trimmed) return null;

  // API keys match the old loose regex and cause youtube_api_400 "Invalid Value".
  if (looksLikeGoogleApiKey(trimmed)) {
    return null;
  }

  if (!trimmed.includes("://") && PLAYLIST_PREFIX_RE.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const list = parsed.searchParams.get("list");
    if (list && (PLAYLIST_PREFIX_RE.test(list) || /^[\w-]{10,}$/.test(list))) {
      if (looksLikeGoogleApiKey(list)) return null;
      return list;
    }
  } catch {
    return null;
  }

  return null;
}

export function youtubeEmbedUrl(
  videoId: string,
  options?: { autoplay?: boolean },
): string {
  const params = new URLSearchParams({ rel: "0" });
  if (options?.autoplay) {
    params.set("autoplay", "1");
    params.set("mute", "0");
  }
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export interface YoutubeChannelResolution {
  channelId: string;
  uploadsPlaylistId: string | null;
}

/** Derive the conventional uploads playlist id (UU…) from a channel id (UC…). */
export function uploadsPlaylistIdFromChannelId(channelId: string): string | null {
  const trimmed = channelId.trim();
  if (!/^UC[\w-]{8,}$/i.test(trimmed)) return null;
  return `UU${trimmed.slice(2)}`;
}

/**
 * Resolve channel id (+ uploads playlist when available) from a channel URL,
 * @handle, channel id, or uploads playlist id.
 */
export async function resolveYoutubeChannel(
  apiKey: string,
  channelRaw: string,
): Promise<YoutubeChannelResolution | null> {
  const trimmed = channelRaw.trim();
  if (!trimmed || looksLikeGoogleApiKey(trimmed)) return null;

  // Already an uploads playlist — recover channel id by UC↔UU convention.
  if (/^UU[\w-]{8,}$/i.test(trimmed)) {
    const channelId = `UC${trimmed.slice(2)}`;
    return { channelId, uploadsPlaylistId: trimmed };
  }

  let channelId: string | null = null;
  let forHandle: string | null = null;
  let forUsername: string | null = null;

  if (/^UC[\w-]{8,}$/i.test(trimmed)) {
    channelId = trimmed;
  } else if (trimmed.startsWith("@")) {
    forHandle = trimmed.slice(1);
  } else {
    try {
      const parsed = new URL(
        trimmed.includes("://")
          ? trimmed
          : `https://youtube.com/${trimmed.startsWith("@") ? trimmed : `@${trimmed}`}`,
      );
      const host = parsed.hostname.replace(/^www\./, "");
      if (host.includes("youtube.com")) {
        const parts = parsed.pathname.split("/").filter(Boolean);
        if (parts[0]?.startsWith("@")) {
          forHandle = parts[0].slice(1);
        } else if (parts[0] === "channel" && parts[1]) {
          channelId = parts[1];
        } else if (parts[0] === "c" && parts[1]) {
          forUsername = parts[1];
        } else if (parts[0] === "user" && parts[1]) {
          forUsername = parts[1];
        }
      }
    } catch {
      // Bare handle without @ — treat as handle when it looks like one.
      if (/^[\w.-]{3,}$/i.test(trimmed) && !trimmed.includes(" ")) {
        forHandle = trimmed.replace(/^@/, "");
      }
    }
  }

  const params = new URLSearchParams({
    part: "id,contentDetails",
    key: apiKey,
  });
  if (channelId) params.set("id", channelId);
  else if (forHandle) params.set("forHandle", forHandle);
  else if (forUsername) params.set("forUsername", forUsername);
  else return null;

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?${params}`,
    { next: { revalidate: 0 } },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`youtube_api_${res.status}:${body.slice(0, 240)}`);
  }
  const data = (await res.json()) as {
    items?: Array<{
      id?: string;
      contentDetails?: { relatedPlaylists?: { uploads?: string } };
    }>;
  };
  const item = data.items?.[0];
  if (!item?.id) {
    // Fallback: search for the handle/title when forHandle misses (common with dotted handles).
    if (forHandle) {
      const searchParams = new URLSearchParams({
        part: "snippet",
        q: forHandle.startsWith("@") ? forHandle : `@${forHandle}`,
        type: "channel",
        maxResults: "5",
        key: apiKey,
      });
      const searchRes = await fetch(
        `https://www.googleapis.com/youtube/v3/search?${searchParams}`,
        { next: { revalidate: 0 } },
      );
      if (searchRes.ok) {
        const searchData = (await searchRes.json()) as {
          items?: Array<{ id?: { channelId?: string }; snippet?: { customUrl?: string; title?: string } }>;
        };
        const needle = forHandle.replace(/^@/, "").toLowerCase();
        const match =
          searchData.items?.find((row) => {
            const custom = String(row.snippet?.customUrl ?? "")
              .replace(/^@/, "")
              .toLowerCase();
            return custom === needle || custom === `@${needle}`;
          }) ?? searchData.items?.[0];
        const foundId = match?.id?.channelId;
        if (foundId) {
          return {
            channelId: foundId,
            uploadsPlaylistId: uploadsPlaylistIdFromChannelId(foundId),
          };
        }
      }
    }
    return null;
  }

  const uploads =
    item.contentDetails?.relatedPlaylists?.uploads ??
    uploadsPlaylistIdFromChannelId(item.id);

  return {
    channelId: item.id,
    uploadsPlaylistId: uploads || null,
  };
}

/** Resolve a channel uploads playlist (UU…) from a channel URL, @handle, or channel id. */
export async function resolveYoutubeUploadsPlaylistId(
  apiKey: string,
  channelRaw: string,
): Promise<string | null> {
  const resolved = await resolveYoutubeChannel(apiKey, channelRaw);
  return resolved?.uploadsPlaylistId ?? null;
}

/** Convert ISO-8601 duration (PT#H#M#S) to mm:ss or h:mm:ss. */
export function formatYoutubeDuration(iso: string | null | undefined): string {
  if (!iso) return "";
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!match) return "";
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return `${minutes}:${pad(seconds)}`;
}
