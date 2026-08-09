"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
import { cn } from "@/lib/utils";

function storyCorridorLabels(item: TalentStoryDocument): string[] {
  const labels = new Set<string>();
  const corridor = item.corridor?.trim();
  if (corridor) labels.add(corridor);
  for (const tag of item.tags ?? []) {
    const value = tag?.trim();
    if (value) labels.add(value);
  }
  return [...labels];
}

function collectCorridors(items: TalentStoryDocument[]): string[] {
  const labels = new Set<string>();
  for (const item of items) {
    for (const label of storyCorridorLabels(item)) {
      labels.add(label);
    }
  }
  return [...labels].sort((a, b) => a.localeCompare(b));
}

function corridorCtaHref(baseHref: string, corridor: string): string {
  const base = baseHref.trim() || "/visa-path";
  try {
    const url = new URL(base, "https://nextgenmove.local");
    url.searchParams.set("corridor", corridor);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}corridor=${encodeURIComponent(corridor)}`;
  }
}

function StoryCard({ item }: { item: TalentStoryDocument }) {
  const name = item.displayName || "Talent";
  const photoUrl = resolveStorageUrl(item.photo);
  const hue = avatarHueForName(name);
  const videoId = item.youtubeVideoId
    ? parseYoutubeVideoId(item.youtubeVideoId) || item.youtubeVideoId
    : null;
  const corridorLabel = storyCorridorLabels(item)[0] ?? item.corridor;

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
          {corridorLabel ? (
            <p className="font-mono text-[10px] uppercase text-fill-accent">
              {corridorLabel}
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
  showViewAll = true,
}: {
  page: PageHomeDocument;
  items: TalentStoryDocument[];
  /** Hide “view all” when already on `/stories`. */
  showViewAll?: boolean;
}) {
  const [activeCorridor, setActiveCorridor] = useState<string | null>(null);

  const corridors = useMemo(() => collectCorridors(items), [items]);
  const allLabel = page.talentStoriesFilterAllLabel || "All corridors";
  const corridorCtaLabel = page.talentStoriesCorridorCtaLabel;
  const corridorCtaBase = page.talentStoriesCorridorCtaHref || "/visa-path";

  const filteredItems = useMemo(() => {
    if (!activeCorridor) return items;
    return items.filter((item) =>
      storyCorridorLabels(item).includes(activeCorridor),
    );
  }, [activeCorridor, items]);

  const viewAllHref = page.talentStoriesViewAllHref || "/stories";
  const viewAllLabel = page.talentStoriesViewAllLabel;
  const showFilters = corridors.length > 0;

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

      {showFilters ? (
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label={allLabel}
        >
          <button
            type="button"
            onClick={() => setActiveCorridor(null)}
            aria-pressed={activeCorridor === null}
            className={cn(
              "inline-flex min-h-7 items-center rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide transition-colors",
              activeCorridor === null
                ? "bg-bg-purple text-fill-accent"
                : "border border-border bg-surface text-text-secondary hover:border-border-accent hover:text-text-primary",
            )}
          >
            {allLabel}
          </button>
          {corridors.map((corridor) => {
            const selected = activeCorridor === corridor;
            return (
              <button
                key={corridor}
                type="button"
                onClick={() => setActiveCorridor(corridor)}
                aria-pressed={selected}
                className={cn(
                  "inline-flex min-h-7 items-center rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide transition-colors",
                  selected
                    ? "bg-bg-purple text-fill-accent"
                    : "border border-border bg-surface text-text-secondary hover:border-border-accent hover:text-text-primary",
                )}
              >
                {corridor}
              </button>
            );
          })}
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="text-sm text-text-secondary">
          {page.talentStoriesEmptyText ||
            "Published talent stories will appear here."}
        </p>
      ) : filteredItems.length === 0 ? (
        <p className="text-sm text-text-secondary">
          {page.talentStoriesEmptyFilteredText ||
            "No published stories for this corridor yet. Try another filter or check back soon."}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <StoryCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {activeCorridor && corridorCtaLabel ? (
        <div>
          <Link
            href={corridorCtaHref(corridorCtaBase, activeCorridor)}
            className="text-sm font-semibold text-fill-accent hover:underline"
          >
            {corridorCtaLabel}
          </Link>
        </div>
      ) : null}

      {showViewAll && viewAllLabel ? (
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
