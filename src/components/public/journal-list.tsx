"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTaxonomies } from "@/lib/hooks/use-taxonomies";
import type { ArticleDocument } from "@/types/cms";

export interface JournalListProps {
  articles: ArticleDocument[];
  labels: Record<string, string>;
}

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
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            {labels.filterCategory}
            <select
              className="rounded-radius border border-border bg-surface-1 px-3 py-2"
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
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            {labels.filterTag}
            <select
              className="rounded-radius border border-border bg-surface-1 px-3 py-2"
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

      <ul className="grid gap-6 md:grid-cols-2">
        {filteredArticles.map((article) => (
          <li
            key={article.id}
            className="rounded-radius border border-border bg-surface-1 p-5"
          >
            <Link href={`/journal/${article.slug}`} className="block space-y-2">
              <h2 className="font-serif text-2xl text-text-primary">{article.title}</h2>
              {article.excerpt ? (
                <p className="text-sm text-text-secondary">{article.excerpt}</p>
              ) : null}
              <p className="text-xs text-text-muted">
                {article.author}
                {article.publishedDate
                  ? ` · ${new Date(article.publishedDate).toLocaleDateString()}`
                  : null}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
