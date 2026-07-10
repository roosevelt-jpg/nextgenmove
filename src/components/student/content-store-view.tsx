"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, CardBody } from "@/components/ui";
import { useTaxonomies } from "@/lib/hooks/use-taxonomies";

interface StoreItem {
  id: string;
  title: string;
  description: string;
  type: string;
  thumbnailUrl: string;
  downloadHref: string | null;
  costCredits: number;
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
      headers: { "Content-Type": "application/json" },
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

  return (
    <div className="space-y-6">
      {labels.creditsBalance ? (
        <p className="text-sm text-text-secondary">
          {labels.creditsBalance.replace("{credits}", String(credits))}
        </p>
      ) : null}

      {labels.filterCategory ? (
        <label className="flex max-w-xs flex-col gap-1 text-sm text-text-secondary">
          {labels.filterCategory}
          <select
            className="rounded-radius border border-border bg-surface-1 px-3 py-2"
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

      {errorCode ? (
        <p className="text-sm text-text-warning" role="alert">
          {labels[errorCode] ?? labels.genericError}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredItems.map((item) => (
          <Card key={item.id}>
            <CardBody className="space-y-3">
              {item.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.thumbnailUrl}
                  alt={item.title}
                  className="h-32 w-full rounded-radius object-cover"
                />
              ) : null}
              <p className="font-medium text-text-primary">{item.title}</p>
              {item.description ? (
                <p className="text-sm text-text-secondary">{item.description}</p>
              ) : null}
              {labels.costCreditsLabel ? (
                <p className="font-mono text-xs text-text-accent">
                  {labels.costCreditsLabel.replace("{credits}", String(item.costCredits))}
                </p>
              ) : null}
              {item.purchased ? (
                <>
                  {labels.unlockedLabel ? (
                    <Badge variant="success">{labels.unlockedLabel}</Badge>
                  ) : null}
                  {item.downloadHref && labels.openContent ? (
                    <a
                      href={item.downloadHref}
                      className="text-sm text-text-primary hover:text-text-accent"
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
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
