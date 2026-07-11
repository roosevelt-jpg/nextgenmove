const VIDEO_ID_RE = /^[\w-]{6,}$/;
/** Playlist IDs are typically PL… / UU… / LL… / OL… */
const PLAYLIST_ID_RE = /^[\w-]{10,}$/;

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

/** Resolve a playlist id from a playlist URL or raw id. */
export function parseYoutubePlaylistId(
  urlOrId: string | null | undefined,
): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  if (!trimmed) return null;

  if (PLAYLIST_ID_RE.test(trimmed) && !trimmed.includes("://")) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const list = parsed.searchParams.get("list");
    if (list && PLAYLIST_ID_RE.test(list)) return list;
  } catch {
    return null;
  }

  return null;
}

export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?rel=0`;
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
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
