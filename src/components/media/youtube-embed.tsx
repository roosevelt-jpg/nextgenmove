"use client";

import { parseYoutubeVideoId, youtubeEmbedUrl } from "@/lib/media/youtube";

interface YoutubeEmbedProps {
  url: string;
  title?: string;
  watchLabel?: string;
}

export function YoutubeEmbed({ url, title, watchLabel }: YoutubeEmbedProps) {
  const videoId = parseYoutubeVideoId(url);

  if (!videoId) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center justify-center rounded-radius-sm border border-fill-primary px-3.5 py-1.5 text-sm font-medium text-text-primary hover:bg-surface-2"
      >
        {watchLabel ?? title ?? url}
      </a>
    );
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-radius border border-border bg-surface-2">
      <iframe
        src={youtubeEmbedUrl(videoId)}
        title={title ?? watchLabel ?? "YouTube"}
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
