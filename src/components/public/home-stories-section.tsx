"use client";

import { useState } from "react";
import type { PageHomeDocument, VideoCardDocument } from "@/types/cms";
import { SectionEyebrow, Modal } from "@/components/ui";

function toEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      if (parsed.pathname.startsWith("/embed/")) return url;
    }
    if (parsed.hostname.includes("vimeo.com")) {
      const id = parsed.pathname.split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

export function HomeStoriesSection({
  page,
  cards,
}: {
  page: PageHomeDocument | null;
  cards: VideoCardDocument[];
}) {
  const [active, setActive] = useState<VideoCardDocument | null>(null);

  if (!cards.length && !page?.storiesEyebrow && !page?.storiesHeadline) {
    return null;
  }

  if (!cards.length) {
    return null;
  }

  const embed = active ? toEmbedUrl(active.videoUrl) : null;

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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card, index) => (
          <button
            key={card.id}
            type="button"
            onClick={() => setActive(card)}
            className="overflow-hidden rounded-radius border border-border bg-surface-1 text-left transition-opacity hover:opacity-95"
          >
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
          </button>
        ))}
      </div>

      <Modal
        open={Boolean(active)}
        onClose={() => setActive(null)}
        title={active?.title}
      >
        {active ? (
          <div className="space-y-3">
            {embed ? (
              <div className="aspect-video overflow-hidden rounded-radius-sm bg-fill-primary">
                <iframe
                  title={active.title}
                  src={embed}
                  className="h-full w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : active.videoUrl ? (
              <a
                href={active.videoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-text-accent underline"
              >
                {active.videoUrl}
              </a>
            ) : null}
            {active.subtitle ? (
              <p className="text-sm text-text-secondary">{active.subtitle}</p>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
