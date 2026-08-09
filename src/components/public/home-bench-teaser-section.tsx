"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PageHomeDocument } from "@/types/cms";
import type { BenchTeaserPayload } from "@/lib/public/bench-teaser";
import { Button, SectionEyebrow } from "@/components/ui";

type BenchTeaserPublic = Pick<
  BenchTeaserPayload,
  "readyCount" | "corridors" | "generatedAt"
>;

export function HomeBenchTeaserSection({
  page,
  initialData,
}: {
  page: PageHomeDocument;
  initialData?: BenchTeaserPublic | null;
}) {
  const [data, setData] = useState<BenchTeaserPublic | null>(
    initialData ?? null,
  );

  useEffect(() => {
    if (initialData) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/public/bench-teaser", {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        setData((await res.json()) as BenchTeaserPublic);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialData]);

  if (!page.benchTeaserHeadline?.trim()) return null;

  const readyCount = data?.readyCount ?? 0;
  const corridors = data?.corridors ?? [];
  const empty = readyCount === 0 && corridors.length === 0;

  return (
    <section className="page-section space-y-4">
      <div className="space-y-1.5">
        {page.benchTeaserEyebrow ? (
          <SectionEyebrow>{page.benchTeaserEyebrow}</SectionEyebrow>
        ) : null}
        <h2 className="font-serif text-2xl text-text-primary md:text-3xl">
          {page.benchTeaserHeadline}
        </h2>
        {page.benchTeaserSubtext ? (
          <p className="max-w-2xl text-sm text-text-secondary">
            {page.benchTeaserSubtext}
          </p>
        ) : null}
      </div>

      {empty ? (
        <p className="text-sm text-text-secondary">
          {page.benchTeaserEmptyText}
        </p>
      ) : (
        <div className="flex flex-col gap-4 rounded-radius border border-border bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="space-y-3">
            <div>
              {page.benchTeaserReadyLabel ? (
                <p className="font-mono text-[10px] uppercase tracking-wide text-fill-accent">
                  {page.benchTeaserReadyLabel}
                </p>
              ) : null}
              <p className="font-serif text-3xl text-text-accent tabular-nums">
                {readyCount}
              </p>
            </div>
            {corridors.length ? (
              <div className="space-y-2">
                {page.benchTeaserCorridorsLabel ? (
                  <p className="font-mono text-[10px] uppercase tracking-wide text-fill-accent">
                    {page.benchTeaserCorridorsLabel}
                  </p>
                ) : null}
                <ul className="flex flex-wrap gap-1.5">
                  {corridors.map((item) => (
                    <li
                      key={item.key}
                      className="rounded-radius-sm border border-border bg-surface-1 px-2 py-1 text-xs text-text-secondary"
                    >
                      <span className="text-text-primary">{item.key}</span>
                      <span className="ml-1.5 font-mono text-text-accent">
                        {item.count}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          {page.benchTeaserCtaLabel && page.benchTeaserCtaHref ? (
            <Link href={page.benchTeaserCtaHref} className="shrink-0">
              <Button>{page.benchTeaserCtaLabel}</Button>
            </Link>
          ) : null}
        </div>
      )}
    </section>
  );
}
