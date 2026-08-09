"use client";

import { useEffect, useState } from "react";
import type { PageHomeDocument } from "@/types/cms";
import type { CorridorIntelligencePayload } from "@/lib/public/corridor-intelligence";
import { SectionEyebrow } from "@/components/ui";

type Labels = Pick<
  PageHomeDocument,
  | "corridorIntelEyebrow"
  | "corridorIntelHeadline"
  | "corridorIntelSubtext"
  | "corridorIntelSkillsLabel"
  | "corridorIntelCitiesLabel"
  | "corridorIntelNationalitiesLabel"
  | "corridorIntelEmptyText"
>;

function ChipList({
  title,
  items,
}: {
  title?: string;
  items: Array<{ key: string; count: number }>;
}) {
  if (!items.length) return null;
  return (
    <div className="space-y-2">
      {title ? (
        <p className="font-mono text-[10px] uppercase tracking-wide text-fill-accent">
          {title}
        </p>
      ) : null}
      <ul className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <li
            key={item.key}
            className="rounded-radius-sm border border-border bg-surface px-2 py-1 text-xs text-text-secondary"
          >
            <span className="text-text-primary">{item.key}</span>
            <span className="ml-1.5 font-mono text-text-accent">{item.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CorridorIntelligenceStrip({
  labels,
  compact = false,
  initialData,
}: {
  labels: Labels;
  compact?: boolean;
  initialData?: CorridorIntelligencePayload | null;
}) {
  const [data, setData] = useState<CorridorIntelligencePayload | null>(
    initialData ?? null,
  );

  useEffect(() => {
    if (initialData) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/public/corridor-intelligence", {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        setData((await res.json()) as CorridorIntelligencePayload);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialData]);

  const empty =
    !data ||
    (!data.topSkills.length &&
      !data.topCities.length &&
      !data.nationalities.length);

  return (
    <section
      className={
        compact
          ? "space-y-3 rounded-radius border border-border bg-surface p-4"
          : "page-section space-y-4"
      }
    >
      <div className="space-y-1.5">
        {labels.corridorIntelEyebrow ? (
          <SectionEyebrow>{labels.corridorIntelEyebrow}</SectionEyebrow>
        ) : null}
        {labels.corridorIntelHeadline ? (
          <h2
            className={
              compact
                ? "text-[14px] font-semibold text-text-primary"
                : "font-serif text-2xl text-text-primary md:text-3xl"
            }
          >
            {labels.corridorIntelHeadline}
          </h2>
        ) : null}
        {labels.corridorIntelSubtext ? (
          <p className="text-sm text-text-secondary">{labels.corridorIntelSubtext}</p>
        ) : null}
      </div>

      {empty ? (
        <p className="text-sm text-text-secondary">
          {labels.corridorIntelEmptyText ||
            "Live corridor aggregates will appear as the pool grows."}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <ChipList
            title={labels.corridorIntelSkillsLabel || "Top skills"}
            items={data!.topSkills}
          />
          <ChipList
            title={labels.corridorIntelCitiesLabel || "Top cities"}
            items={data!.topCities}
          />
          <ChipList
            title={
              labels.corridorIntelNationalitiesLabel || "Nationalities"
            }
            items={data!.nationalities}
          />
        </div>
      )}
    </section>
  );
}
