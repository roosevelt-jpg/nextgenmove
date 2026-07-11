"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { YoutubeEmbed } from "@/components/media/youtube-embed";
import {
  AdvancedFilters,
  Badge,
  Button,
  Card,
  CardBody,
  type AdvancedFilterField,
  type AdvancedFilterValue,
} from "@/components/ui";
import { applyClientFilters, uniqueOptionValues } from "@/lib/filters/apply-client-filters";
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
  const [filters, setFilters] = useState<Record<string, AdvancedFilterValue>>({
    search: "",
    category: "",
    type: "",
    access: "",
  });
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

  const filterFields = useMemo<AdvancedFilterField[]>(
    () => [
      {
        id: "search",
        type: "search",
        labelKey: "search",
        placeholderKey: "searchPlaceholder",
      },
      {
        id: "category",
        type: "select",
        labelKey: "filterCategory",
        allKey: "allCategories",
        options: (taxonomies.category ?? []).map((option) => ({
          value: option.value,
          label: option.label,
        })),
      },
      {
        id: "type",
        type: "select",
        labelKey: "filterType",
        allKey: "filterAll",
        options: uniqueOptionValues(items.map((item) => item.type)),
      },
      {
        id: "access",
        type: "select",
        labelKey: "filterAccess",
        allKey: "filterAll",
        options: [
          { value: "purchased", label: labels.accessPurchased ?? "Unlocked" },
          { value: "locked", label: labels.accessLocked ?? "Locked" },
        ],
      },
    ],
    [items, labels.accessLocked, labels.accessPurchased, taxonomies.category],
  );

  const filteredItems = useMemo(
    () =>
      applyClientFilters(items, {
        search: {
          value: filters.search,
          accessors: [
            (item) => item.title,
            (item) => item.description,
            (item) => item.type,
            (item) => item.category,
          ],
        },
        equals: [
          { value: filters.category, accessor: (item) => item.category },
          { value: filters.type, accessor: (item) => item.type },
        ],
        booleans: [
          {
            value:
              filters.access === "purchased"
                ? true
                : filters.access === "locked"
                  ? false
                  : null,
            accessor: (item) => item.purchased,
          },
        ],
      }),
    [filters, items],
  );

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
      </div>

      <AdvancedFilters
        labels={labels}
        fields={filterFields}
        values={filters}
        onChange={setFilters}
        clearKey="clearFilters"
      />

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
                              className="inline-flex items-center justify-center rounded-radius-sm bg-grad-rouse px-2.5 py-1 text-xs font-medium text-on-gradient hover:opacity-90"
                            >
                              {labels.openLink ?? labels.openContent}
                            </a>
                          ) : null}
                          {item.downloadHref && labels.openContent ? (
                            <a
                              href={item.downloadHref}
                              className="inline-flex items-center justify-center rounded-radius-sm bg-grad-rouse px-2.5 py-1 text-xs font-medium text-on-gradient hover:opacity-90"
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
