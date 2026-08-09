"use client";

import Link from "next/link";
import type { PageHomeDocument, TalentStoryDocument } from "@/types/cms";
import { SectionEyebrow } from "@/components/ui";
import {
  avatarHueForName,
  initialsFromName,
} from "@/lib/avatar-hue";
import { resolveStorageUrl } from "@/lib/storage/file-ref";
import {
  parseYoutubeVideoId,
  youtubeEmbedUrl,
} from "@/lib/media/youtube";

function StoryCard({ item }: { item: TalentStoryDocument }) {
  const name = item.displayName || "Talent";
  const photoUrl = resolveStorageUrl(item.photo);
  const hue = avatarHueForName(name);
  const videoId = item.youtubeVideoId
    ? parseYoutubeVideoId(item.youtubeVideoId) || item.youtubeVideoId
    : null;

  return (
    <article className="flex flex-col gap-3 rounded-radius border border-border bg-surface p-4">
      <div className="flex items-center gap-3">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt=""
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold"
            style={{ background: hue.bg, color: hue.fg }}
            aria-hidden
          >
            {initialsFromName(name)}
          </span>
        )}
        <div>
          <p className="text-sm font-medium text-text-primary">{name}</p>
          {item.corridor ? (
            <p className="font-mono text-[10px] uppercase text-fill-accent">
              {item.corridor}
            </p>
          ) : null}
        </div>
      </div>
      <p className="text-sm leading-relaxed text-text-secondary">
        “{item.quote}”
      </p>
      {videoId ? (
        <div className="aspect-video overflow-hidden rounded-radius-sm border border-border">
          <iframe
            title={`${name} story`}
            src={youtubeEmbedUrl(videoId)}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : null}
    </article>
  );
}

export function HomeTalentStoriesSection({
  page,
  items,
}: {
  page: PageHomeDocument;
  items: TalentStoryDocument[];
}) {
  const viewAllHref = page.talentStoriesViewAllHref || "/stories";
  const viewAllLabel = page.talentStoriesViewAllLabel;

  return (
    <section className="page-section space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-2xl space-y-2">
          {page.talentStoriesEyebrow ? (
            <SectionEyebrow>{page.talentStoriesEyebrow}</SectionEyebrow>
          ) : null}
          {page.talentStoriesHeadline ? (
            <h2 className="font-serif text-2xl text-text-primary md:text-3xl">
              {page.talentStoriesHeadline}
            </h2>
          ) : null}
          {page.talentStoriesSubtext ? (
            <p className="text-sm text-text-secondary">
              {page.talentStoriesSubtext}
            </p>
          ) : null}
        </div>
        {page.talentStoriesManagedLabel ? (
          <p className="text-xs text-text-muted">{page.talentStoriesManagedLabel}</p>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-text-secondary">
          {page.talentStoriesEmptyText ||
            "Published talent stories will appear here."}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <StoryCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {viewAllLabel ? (
        <div>
          <Link
            href={viewAllHref}
            className="text-sm font-semibold text-fill-accent hover:underline"
          >
            {viewAllLabel}
          </Link>
        </div>
      ) : null}
    </section>
  );
}
