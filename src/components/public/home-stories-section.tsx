"use client";

import { useMemo } from "react";
import type { PageHomeDocument, VideoCardDocument } from "@/types/cms";
import { SectionEyebrow } from "@/components/ui";
import { parseYoutubeVideoId } from "@/lib/media/youtube";
import { isDemoStoryCards } from "@/lib/public/demo-story-videos";
import styles from "./home-stories-section.module.css";

function youtubeWatchUrl(card: VideoCardDocument): string | null {
  if (card.videoUrl) {
    const id = parseYoutubeVideoId(card.videoUrl);
    if (id) return `https://www.youtube.com/watch?v=${id}`;
    if (/^https?:\/\//i.test(card.videoUrl)) return card.videoUrl;
  }
  if (card.youtubeVideoId) {
    return `https://www.youtube.com/watch?v=${card.youtubeVideoId}`;
  }
  return null;
}

function buildLoop(cards: VideoCardDocument[]): VideoCardDocument[] {
  if (!cards.length) return [];
  let sequence = [...cards];
  // Enough cards so the strip feels full on wide screens
  while (sequence.length < 6) {
    sequence = [...sequence, ...cards];
  }
  // Exact duplicate for seamless -50% marquee
  return [...sequence, ...sequence];
}

function VideoCard({
  card,
  index,
  badge,
}: {
  card: VideoCardDocument;
  index: number;
  badge?: string;
}) {
  const href = youtubeWatchUrl(card);
  const thumbStyle = card.thumbnailUrl
    ? {
        backgroundImage: `url(${card.thumbnailUrl})`,
      }
    : {
        backgroundImage:
          index % 3 === 1
            ? "linear-gradient(135deg, #27500A, #9A6A3C)"
            : index % 3 === 2
              ? "linear-gradient(135deg, #8B3A3A, #4B3F9C)"
              : "linear-gradient(135deg, #4B3F9C, #C97A2E)",
      };

  const inner = (
    <>
      <div className={styles.thumb} style={thumbStyle} />
      <div className={styles.scrim} aria-hidden />
      {card.duration ? (
        <span className={styles.duration}>{card.duration}</span>
      ) : null}
      <span className={styles.play} aria-hidden>
        <span className={styles.playBtn}>
          <span className={styles.playIcon} />
        </span>
      </span>
      <div className={styles.meta}>
        {badge ? <p className={styles.badge}>{badge}</p> : null}
        {card.title ? <p className={styles.title}>{card.title}</p> : null}
        {card.subtitle ? (
          <p className={styles.subtitle}>{card.subtitle}</p>
        ) : null}
      </div>
    </>
  );

  const label = [card.title, card.subtitle].filter(Boolean).join(" — ");

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={styles.card}
        aria-label={label || undefined}
      >
        {inner}
      </a>
    );
  }

  return <div className={styles.card}>{inner}</div>;
}

export function HomeStoriesSection({
  page,
  cards,
}: {
  page: PageHomeDocument | null;
  cards: VideoCardDocument[];
}) {
  const loopCards = useMemo(() => buildLoop(cards), [cards]);
  const showingDemos = isDemoStoryCards(cards);
  const badge = showingDemos
    ? page?.storiesDemoBadge?.trim() || page?.storiesCardBadge?.trim() || ""
    : page?.storiesCardBadge?.trim() || "";

  if (!cards.length && !page?.storiesEyebrow && !page?.storiesHeadline) {
    return null;
  }

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div className="space-y-2">
          {page?.storiesEyebrow ? (
            <SectionEyebrow>{page.storiesEyebrow}</SectionEyebrow>
          ) : null}
          {page?.storiesHeadline ? (
            <h2 className={styles.headline}>{page.storiesHeadline}</h2>
          ) : null}
        </div>
        {page?.storiesManagedLabel ? (
          <span className={styles.managed}>{page.storiesManagedLabel}</span>
        ) : null}
      </div>

      {loopCards.length ? (
        <div className={styles.band}>
          <div className={`${styles.viewport} ${styles.pauseOnHover}`}>
            <div
              className={styles.track}
              style={{ ["--stories-duration" as string]: "70s" }}
            >
              {loopCards.map((card, index) => (
                <VideoCard
                  key={`${card.id}-${index}`}
                  card={card}
                  index={index}
                  badge={badge}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
