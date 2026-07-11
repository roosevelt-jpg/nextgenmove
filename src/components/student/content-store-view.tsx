"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { YoutubeEmbed } from "@/components/media/youtube-embed";
import { Badge, Button, Card, CardBody } from "@/components/ui";
import { parseYoutubeVideoId } from "@/lib/media/youtube";
import { useTaxonomies } from "@/lib/hooks/use-taxonomies";

interface StoreItem {
  id: string;
  title: string;
  description: string;
  type: string;
  thumbnailUrl: string;
  downloadHref: string | null;
  costCredits: number;
  priceEur: number | null;
  emojiIcon: string;
  linkUrl: string | null;
  category: string;
  purchased: boolean;
}

export interface ContentStoreViewProps {
  labels: Record<string, string>;
}

export function ContentStoreView({ labels }: ContentStoreViewProps) {
  const { taxonomies } = useTaxonomies();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [credits, setCredits] = useState(0);
  const [category, setCategory] = useState("");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [watchingId, setWatchingId] = useState<string | null>(null);

  const loadStore = useCallback(async () => {
    const response = await fetch("/api/student/store");
    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as { items: StoreItem[]; credits: number };
    setItems(data.items);
    setCredits(data.credits);
  }, []);

  useEffect(() => {
    void loadStore();
  }, [loadStore]);

  const filteredItems = useMemo(() => {
    if (!category) {
      return items;
    }

    return items.filter((item) => item.category === category);
  }, [category, items]);

  const purchase = async (contentItemId: string) => {
    setErrorCode(null);
    setLoadingItemId(contentItemId);

    const response = await fetch("/api/student/store/purchase", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({ contentItemId }),
    });

    setLoadingItemId(null);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setErrorCode(payload?.error ?? "");
      return;
    }

    await loadStore();
  };

  const priceSuffix = (item: StoreItem) => {
    if (typeof item.priceEur !== "number") return "";
    const template = labels.priceEurSuffix ?? " · €{amount}";
    return template.replace("{amount}", String(item.priceEur));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-radius border border-border bg-grad-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        {labels.creditsBalance ? (
          <p className="font-serif text-xl text-text-primary">
            {labels.creditsBalance.replace("{credits}", String(credits))}
          </p>
        ) : null}

        {labels.filterCategory ? (
          <label className="flex max-w-xs flex-col gap-1 text-sm text-text-secondary sm:ml-auto">
            {labels.filterCategory}
            <select
              className="rounded-radius border border-border bg-bg px-3 py-2"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="">{labels.allCategories}</option>
              {(taxonomies.category ?? []).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {errorCode ? (
        <p className="text-sm text-text-warning" role="alert">
          {labels[errorCode] ?? labels.genericError}
        </p>
      ) : null}

      <ul className="space-y-3">
        {filteredItems.map((item) => {
          const isVideo =
            item.type === "video" ||
            item.type === "webinar" ||
            Boolean(parseYoutubeVideoId(item.linkUrl));
          const showPlayer = item.purchased && watchingId === item.id && item.linkUrl;

          return (
            <li key={item.id}>
              <Card>
                <CardBody className="flex flex-col gap-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <span
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-radius bg-brand-lavender text-lg"
                        aria-hidden="true"
                      >
                        {item.emojiIcon || initialsFromTitle(item.title)}
                      </span>
                      <div className="min-w-0 space-y-1">
                        <p className="font-medium text-text-primary">{item.title}</p>
                        {item.description ? (
                          <p className="text-sm text-text-secondary">{item.description}</p>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {item.category ? (
                            <span className="rounded-radius bg-bg-tag px-2 py-0.5 text-xs font-medium text-text-tag">
                              {item.category}
                            </span>
                          ) : null}
                          {labels.costCreditsLabel ? (
                            <p className="font-mono text-xs text-text-accent">
                              {labels.costCreditsLabel.replace(
                                "{credits}",
                                String(item.costCredits),
                              )}
                              {priceSuffix(item)}
                            </p>
                          ) : null}
                          {item.purchased && labels.unlockedLabel ? (
                            <Badge variant="success">{labels.unlockedLabel}</Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                      {item.purchased ? (
                        <>
                          {isVideo && item.linkUrl ? (
                            <Button
                              variant="outline"
                              onClick={() =>
                                setWatchingId((current) =>
                                  current === item.id ? null : item.id,
                                )
                              }
                            >
                              {watchingId === item.id
                                ? labels.hideVideo ?? labels.openLink
                                : labels.watchVideo ?? labels.openLink}
                            </Button>
                          ) : null}
                          {item.linkUrl && !isVideo ? (
                            <a
                              href={item.linkUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center rounded-radius-sm bg-grad-rouse px-3.5 py-1.5 text-sm font-medium text-on-gradient hover:opacity-90"
                            >
                              {labels.openLink ?? labels.openContent}
                            </a>
                          ) : null}
                          {item.downloadHref && labels.openContent ? (
                            <a
                              href={item.downloadHref}
                              className="inline-flex items-center justify-center rounded-radius-sm bg-grad-rouse px-3.5 py-1.5 text-sm font-medium text-on-gradient hover:opacity-90"
                            >
                              {labels.openContent}
                            </a>
                          ) : null}
                        </>
                      ) : labels.purchaseAction ? (
                        <Button
                          disabled={loadingItemId === item.id}
                          onClick={() => purchase(item.id)}
                        >
                          {labels.purchaseAction}
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {showPlayer ? (
                    <YoutubeEmbed
                      url={item.linkUrl!}
                      title={item.title}
                      watchLabel={labels.watchVideo}
                    />
                  ) : null}
                </CardBody>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function initialsFromTitle(title: string): string {
  const parts = title.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return "";
  }
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}
