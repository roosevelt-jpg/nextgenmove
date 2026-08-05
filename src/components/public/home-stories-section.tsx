"use client";

import { useEffect, useMemo, useState } from "react";
import type { PageHomeDocument, VideoCardDocument } from "@/types/cms";
import { SectionEyebrow } from "@/components/ui";
import {
  parseYoutubeVideoId,
  youtubeEmbedUrl,
} from "@/lib/media/youtube";
import { isDemoStoryCards } from "@/lib/public/demo-story-videos";
import styles from "./home-stories-section.module.css";

function resolveVideoId(card: VideoCardDocument): string | null {
  if (card.youtubeVideoId) return card.youtubeVideoId;
  if (card.videoUrl) return parseYoutubeVideoId(card.videoUrl);
  return null;
}

function buildLoop(cards: VideoCardDocument[]): VideoCardDocument[] {
  if (!cards.length) return [];
  let sequence = [...cards];
  while (sequence.length < 6) {
    sequence = [...sequence, ...cards];
  }
  return [...sequence, ...sequence];
}

function VideoCard({
  card,
  index,
  badge,
  onPlay,
}: {
  card: VideoCardDocument;
  index: number;
  badge?: string;
  onPlay?: (card: VideoCardDocument) => void;
}) {
  const videoId = resolveVideoId(card);
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

  if (videoId && onPlay) {
    return (
      <button
        type="button"
        className={styles.card}
        aria-label={label ? `Play ${label}` : "Play video"}
        onClick={() => onPlay(card)}
      >
        {inner}
      </button>
    );
  }

  return <div className={styles.card}>{inner}</div>;
}

function StoryPlayerModal({
  card,
  onClose,
}: {
  card: VideoCardDocument;
  onClose: () => void;
}) {
  const videoId = resolveVideoId(card);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (!videoId) return null;

  return (
    <div
      className={styles.modalRoot}
      role="dialog"
      aria-modal="true"
      aria-label={card.title || "Video"}
      onClick={onClose}
    >
      <div
        className={styles.modalPanel}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div className={styles.modalMeta}>
            {card.title ? (
              <p className={styles.modalTitle}>{card.title}</p>
            ) : null}
            {card.subtitle ? (
              <p className={styles.modalSubtitle}>{card.subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            className={styles.modalClose}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className={styles.modalFrame}>
          <iframe
            src={youtubeEmbedUrl(videoId, { autoplay: true })}
            title={card.title || "YouTube"}
            className={styles.modalIframe}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </div>
    </div>
  );
}

export function HomeStoriesSection({
  page,
  cards,
}: {
  page: PageHomeDocument | null;
  cards: VideoCardDocument[];
}) {
  const [active, setActive] = useState<VideoCardDocument | null>(null);
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
                  onPlay={setActive}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {active ? (
        <StoryPlayerModal card={active} onClose={() => setActive(null)} />
      ) : null}
    </section>
  );
}
