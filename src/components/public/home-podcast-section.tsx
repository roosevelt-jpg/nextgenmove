"use client";

import { useRef, useState } from "react";
import type { PageHomeDocument, PodcastEpisodeDocument } from "@/types/cms";
import { SectionEyebrow } from "@/components/ui";

const HOME_PODCAST_LIMIT = 6;

export function HomePodcastSection({
  page,
  episodes,
}: {
  page: PageHomeDocument | null;
  episodes: PodcastEpisodeDocument[];
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const visible = episodes.slice(0, HOME_PODCAST_LIMIT);

  if (!visible.length) {
    return null;
  }

  const toggle = async (episode: PodcastEpisodeDocument) => {
    if (!episode.audioUrl) return;
    if (playingId === episode.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (!audioRef.current) {
      audioRef.current = new Audio(episode.audioUrl);
      audioRef.current.addEventListener("ended", () => setPlayingId(null));
    } else {
      audioRef.current.pause();
      audioRef.current.src = episode.audioUrl;
    }
    try {
      await audioRef.current.play();
      setPlayingId(episode.id);
    } catch {
      setPlayingId(null);
    }
  };

  return (
    <section className="page-section space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          {page?.podcastEyebrow ? (
            <SectionEyebrow>{page.podcastEyebrow}</SectionEyebrow>
          ) : null}
          {page?.podcastHeadline ? (
            <h2 className="font-serif text-2xl text-text-primary md:text-3xl">
              {page.podcastHeadline}
            </h2>
          ) : null}
        </div>
        {page?.podcastManagedLabel ? (
          <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
            {page.podcastManagedLabel}
          </span>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {visible.map((episode) => (
          <div
            key={episode.id}
            className="flex items-center gap-3 rounded-radius border border-border bg-grad-card px-3.5 py-3"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-radius-sm bg-fill-accent font-mono text-[10px] font-bold text-on-accent">
              EP{episode.episodeNumber || ""}
            </div>
            <div className="min-w-0 flex-1">
              {episode.episodeNumber ? (
                <p className="font-mono text-[9.5px] uppercase tracking-wide text-text-accent">
                  Episode {episode.episodeNumber}
                </p>
              ) : null}
              {episode.title ? (
                <p className="truncate text-sm font-semibold text-text-primary">
                  {episode.title}
                </p>
              ) : null}
              {episode.guestName ? (
                <p className="truncate text-xs text-text-secondary">
                  with {episode.guestName}
                </p>
              ) : null}
            </div>
            <div
              className="hidden h-5 items-end gap-0.5 sm:flex"
              aria-hidden
            >
              {[0, 0.15, 0.3, 0.1].map((delay, i) => (
                <span
                  key={i}
                  className="w-0.5 rounded-sm bg-fill-accent"
                  style={{
                    height: playingId === episode.id ? "100%" : `${30 + i * 20}%`,
                    animation:
                      playingId === episode.id
                        ? `pulse 1.1s ease-in-out ${delay}s infinite`
                        : undefined,
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => void toggle(episode)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-grad-rouse text-xs text-on-gradient"
              aria-label={playingId === episode.id ? "Pause" : "Play"}
            >
              {playingId === episode.id ? "❚❚" : "▶"}
            </button>
            {episode.duration ? (
              <span className="w-12 shrink-0 text-right font-mono text-[10.5px] text-text-muted">
                {episode.duration}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
