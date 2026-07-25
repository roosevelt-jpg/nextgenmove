"use client";

import { useMemo } from "react";
import type { PageHomeDocument, VideoCardDocument } from "@/types/cms";
import { SectionEyebrow } from "@/components/ui";
import { parseYoutubeVideoId } from "@/lib/media/youtube";

function youtubeWatchUrl(card: VideoCardDocument): string | null {
  if (card.videoUrl) {
    const id = parseYoutubeVideoId(card.videoUrl);
    if (id) return `https://www.youtube.com/watch?v=${id}`;
    if (/^https?:\/\//i.test(card.videoUrl)) return card.videoUrl;
  }
  return null;
}

function VideoCard({
  card,
  index,
}: {
  card: VideoCardDocument;
  index: number;
}) {
  const href = youtubeWatchUrl(card);

  const inner = (
    <>
      <div
        className="relative aspect-[16/10] bg-fill-accent"
        style={
          card.thumbnailUrl
            ? {
                backgroundImage: `url(${card.thumbnailUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {
                background:
                  index % 3 === 1
                    ? "linear-gradient(135deg, #27500A, #9A6A3C)"
                    : index % 3 === 2
                      ? "linear-gradient(135deg, #8B3A3A, #4B3F9C)"
                      : "linear-gradient(135deg, #4B3F9C, #C97A2E)",
              }
        }
      >
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-1 text-sm text-fill-accent shadow-sm">
            ▶
          </span>
        </span>
        {card.duration ? (
          <span className="absolute bottom-2 right-2 rounded bg-fill-primary/70 px-1.5 py-0.5 font-mono text-[10px] text-on-primary">
            {card.duration}
          </span>
        ) : null}
      </div>
      <div className="space-y-0.5 px-3 py-2.5">
        {card.title ? (
          <p className="text-sm font-semibold text-text-primary">{card.title}</p>
        ) : null}
        {card.subtitle ? (
          <p className="text-xs text-text-secondary">{card.subtitle}</p>
        ) : null}
      </div>
    </>
  );

  const className =
    "w-[min(280px,70vw)] shrink-0 overflow-hidden rounded-radius border border-border bg-grad-card text-left transition-opacity hover:opacity-95";

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={className}
      >
        {inner}
      </a>
    );
  }

  return <div className={className}>{inner}</div>;
}

export function HomeStoriesSection({
  page,
  cards,
}: {
  page: PageHomeDocument | null;
  cards: VideoCardDocument[];
}) {
  const loopCards = useMemo(() => {
    if (!cards.length) return [];
    // Duplicate for seamless marquee when few videos
    if (cards.length < 3) return [...cards, ...cards, ...cards];
    return [...cards, ...cards];
  }, [cards]);

  if (!cards.length && !page?.storiesEyebrow && !page?.storiesHeadline) {
    return null;
  }

  return (
    <section className="page-section space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          {page?.storiesEyebrow ? (
            <SectionEyebrow>{page.storiesEyebrow}</SectionEyebrow>
          ) : null}
          {page?.storiesHeadline ? (
            <h2 className="font-serif text-2xl text-text-primary md:text-3xl">
              {page.storiesHeadline}
            </h2>
          ) : null}
        </div>
        {page?.storiesManagedLabel ? (
          <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
            {page.storiesManagedLabel}
          </span>
        ) : null}
      </div>

      {loopCards.length ? (
        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-bg to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-bg to-transparent" />
          <div className="home-stories-marquee flex w-max gap-3">
            {loopCards.map((card, index) => (
              <VideoCard
                key={`${card.id}-${index}`}
                card={card}
                index={index}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
