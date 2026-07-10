"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTaxonomies } from "@/lib/hooks/use-taxonomies";
import type { ArticleDocument } from "@/types/cms";

export interface JournalListProps {
  articles: ArticleDocument[];
  labels: Record<string, string>;
}

const COVER_TONES = [
  "from-brand-indigo-1 to-brand-amber-2",
  "from-text-success to-brand-amber-2",
  "from-brand-indigo-2 to-border-accent",
] as const;

export function JournalList({ articles, labels }: JournalListProps) {
  const { taxonomies } = useTaxonomies();
  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");

  const tagOptions = useMemo(
    () => [...new Set(articles.flatMap((article) => article.tags))],
    [articles],
  );

  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      if (category && article.category !== category) {
        return false;
      }

      if (tag && !article.tags.includes(tag)) {
        return false;
      }

      return true;
    });
  }, [articles, category, tag]);

  if (!articles.length) {
    return null;
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2">
        {labels.filterCategory ? (
          <label className="flex flex-col gap-1.5 font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted">
            {labels.filterCategory}
            <select
              className="rounded-radius border border-border bg-surface-1 px-3 py-2 text-sm font-normal normal-case tracking-normal text-text-primary"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="">{labels.all}</option>
              {(taxonomies.category ?? []).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {labels.filterTag ? (
          <label className="flex flex-col gap-1.5 font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted">
            {labels.filterTag}
            <select
              className="rounded-radius border border-border bg-surface-1 px-3 py-2 text-sm font-normal normal-case tracking-normal text-text-primary"
              value={tag}
              onChange={(event) => setTag(event.target.value)}
            >
              <option value="">{labels.all}</option>
              {tagOptions.map((option) => (
                <option key={option} value={option}>
                  {taxonomies.articleTag?.find((item) => item.value === option)?.label ??
                    option}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <ul className="grid gap-6 md:grid-cols-3">
        {filteredArticles.map((article, index) => (
          <li
            key={article.id}
            className="overflow-hidden rounded-radius border border-border bg-surface-1"
          >
            <Link href={`/journal/${article.slug}`} className="block">
              {article.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={article.coverImageUrl}
                  alt=""
                  className="aspect-[16/10] w-full object-cover"
                />
              ) : (
                <div
                  className={`aspect-[16/10] w-full bg-gradient-to-br ${COVER_TONES[index % COVER_TONES.length]}`}
                />
              )}
              <div className="space-y-2 p-5">
                {article.category ? (
                  <p className="font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted">
                    {taxonomies.category?.find((c) => c.value === article.category)
                      ?.label ?? article.category}
                  </p>
                ) : null}
                <h2 className="font-serif text-xl text-text-primary">
                  {article.title}
                </h2>
                {article.excerpt ? (
                  <p className="text-sm text-text-secondary">{article.excerpt}</p>
                ) : null}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
