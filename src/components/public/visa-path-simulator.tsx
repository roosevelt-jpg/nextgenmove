"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type {
  PageVisaPathDocument,
  VisaPathCorridor,
  VisaPathStep,
} from "@/types/cms";
import { EVIDENCE_KINDS, type EvidenceKind } from "@/types/move-os";
import { SectionEyebrow } from "@/components/ui";

function normalizeKinds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object" && "value" in item) {
        return String((item as { value?: string }).value ?? "").trim();
      }
      return "";
    })
    .filter(Boolean);
}

function normalizeCorridor(raw: VisaPathCorridor): VisaPathCorridor {
  return {
    id: String(raw.id ?? "").trim(),
    label: String(raw.label ?? "").trim(),
    steps: Array.isArray(raw.steps)
      ? raw.steps.map(
          (step): VisaPathStep => ({
            title: String(step.title ?? "").trim(),
            days: Number(step.days ?? 0) || 0,
            evidenceKinds: normalizeKinds(step.evidenceKinds),
          }),
        )
      : [],
  };
}

function kindLabel(kind: string): string {
  return kind.replace(/_/g, " ");
}

function withQuery(
  href: string,
  params: Record<string, string | undefined>,
): string {
  const base = href.trim() || "/";
  try {
    const url = new URL(base, "https://nextgenmove.local");
    for (const [key, value] of Object.entries(params)) {
      if (value) url.searchParams.set(key, value);
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return base;
  }
}

export function VisaPathSimulator({
  page,
  studentEvidenceKinds,
  isStudent = false,
}: {
  page: PageVisaPathDocument;
  studentEvidenceKinds?: string[] | null;
  isStudent?: boolean;
}) {
  const searchParams = useSearchParams();
  const corridorQuery = searchParams.get("corridor")?.trim() ?? "";

  const corridors = useMemo(
    () =>
      (page.corridors ?? [])
        .map(normalizeCorridor)
        .filter((c) => c.id && c.label),
    [page.corridors],
  );

  const [selectedId, setSelectedId] = useState(corridors[0]?.id ?? "");

  useEffect(() => {
    const matched = corridorQuery
      ? corridors.find(
          (c) =>
            c.id === corridorQuery ||
            c.label.toLowerCase() === corridorQuery.toLowerCase(),
        )
      : null;
    if (matched) {
      setSelectedId(matched.id);
      return;
    }
    if (!corridors.some((c) => c.id === selectedId)) {
      setSelectedId(corridors[0]?.id ?? "");
    }
  }, [corridors, corridorQuery, selectedId]);

  const selected = corridors.find((c) => c.id === selectedId) ?? null;
  const totalDays = selected?.steps.reduce((sum, step) => sum + step.days, 0) ?? 0;

  const requiredKinds = useMemo(() => {
    if (!selected) return [] as string[];
    const set = new Set<string>();
    for (const step of selected.steps) {
      for (const kind of step.evidenceKinds) set.add(kind);
    }
    return [...set];
  }, [selected]);

  const presentSet = useMemo(
    () => new Set((studentEvidenceKinds ?? []).map((k) => k.toLowerCase())),
    [studentEvidenceKinds],
  );

  const missingKinds = isStudent
    ? requiredKinds.filter((kind) => !presentSet.has(kind.toLowerCase()))
    : requiredKinds;
  const presentKinds = isStudent
    ? requiredKinds.filter((kind) => presentSet.has(kind.toLowerCase()))
    : [];

  const knownKinds = new Set<string>(EVIDENCE_KINDS);
  const firstMissing = missingKinds[0];
  const missingKindCta =
    firstMissing && page.missingKindCtaTemplate
      ? page.missingKindCtaTemplate.replace("{kind}", kindLabel(firstMissing))
      : null;

  const anonymousHref = withQuery(page.anonymousUploadHref || "/sign-up", {
    corridor: selected?.id,
    kind: firstMissing,
  });
  const vaultHref = withQuery(page.vaultOpenHref || "/student/evidence", {
    corridor: selected?.id,
    kind: firstMissing,
  });

  return (
    <div className="space-y-6">
      <header className="max-w-2xl space-y-3">
        {page.eyebrow ? <SectionEyebrow>{page.eyebrow}</SectionEyebrow> : null}
        {page.headline ? (
          <h1 className="font-serif text-3xl text-text-primary md:text-4xl">
            {page.headline}
          </h1>
        ) : null}
        {page.subtext ? (
          <p className="text-sm text-text-secondary sm:text-base">{page.subtext}</p>
        ) : null}
      </header>

      {corridors.length === 0 ? (
        <p className="text-sm text-text-secondary">
          {page.emptyCorridorsText}
        </p>
      ) : (
        <>
          <label className="block max-w-md space-y-1.5">
            <span className="font-mono text-[11px] uppercase tracking-wide text-fill-accent">
              {page.selectCorridorLabel}
            </span>
            <select
              className="w-full rounded-radius border border-border bg-surface px-3 py-2 text-sm text-text-primary"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {corridors.map((corridor) => (
                <option key={corridor.id} value={corridor.id}>
                  {corridor.label}
                </option>
              ))}
            </select>
          </label>

          {selected ? (
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <section className="space-y-3 rounded-radius border border-border bg-surface p-4">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <h2 className="font-serif text-xl text-text-primary">
                    {page.timelineLabel}
                  </h2>
                  {page.totalDaysLabel ? (
                    <p className="font-mono text-[11px] uppercase text-text-accent">
                      {page.totalDaysLabel.replace("{days}", String(totalDays))}
                    </p>
                  ) : null}
                </div>
                <ol className="space-y-3">
                  {selected.steps.map((step, index) => (
                    <li
                      key={`${selected.id}-${index}`}
                      className="rounded-radius-sm border border-border bg-surface-2/60 px-3 py-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-mono text-[10px] uppercase text-fill-accent">
                            {String(index + 1).padStart(2, "0")}
                          </p>
                          <p className="text-sm font-medium text-text-primary">
                            {step.title}
                          </p>
                        </div>
                        <span className="shrink-0 font-mono text-xs text-text-accent">
                          {step.days}d
                        </span>
                      </div>
                      {step.evidenceKinds.length ? (
                        <ul className="mt-2 flex flex-wrap gap-1.5">
                          {step.evidenceKinds.map((kind) => (
                            <li
                              key={kind}
                              className="rounded-radius-sm bg-bg-purple px-2 py-0.5 font-mono text-[10px] uppercase text-fill-accent"
                            >
                              {kindLabel(kind)}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </section>

              <section className="space-y-3 rounded-radius border border-border bg-surface p-4">
                <h2 className="font-serif text-xl text-text-primary">
                  {page.evidenceLabel}
                </h2>
                {requiredKinds.length === 0 ? (
                  <p className="text-sm text-text-secondary">—</p>
                ) : (
                  <ul className="space-y-1.5">
                    {requiredKinds.map((kind) => (
                      <li
                        key={kind}
                        className="flex items-center justify-between gap-2 text-sm text-text-secondary"
                      >
                        <span>{kindLabel(kind)}</span>
                        {knownKinds.has(kind as EvidenceKind) ? null : (
                          <span className="font-mono text-[10px] text-text-muted">
                            custom
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {isStudent && studentEvidenceKinds != null ? (
                  <div className="space-y-3 border-t border-border pt-3">
                    {presentKinds.length ? (
                      <div>
                        <p className="mb-1.5 font-mono text-[10px] uppercase text-text-success">
                          {page.presentEvidenceLabel}
                        </p>
                        <ul className="flex flex-wrap gap-1.5">
                          {presentKinds.map((kind) => (
                            <li
                              key={kind}
                              className="rounded-radius-sm bg-bg-success px-2 py-0.5 text-xs text-text-success"
                            >
                              {kindLabel(kind)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <div>
                      <p className="mb-1.5 font-mono text-[10px] uppercase text-text-warning">
                        {page.missingEvidenceLabel}
                      </p>
                      {missingKinds.length === 0 ? (
                        <p className="text-sm text-text-success">
                          {page.presentEvidenceLabel}
                        </p>
                      ) : (
                        <ul className="flex flex-wrap gap-1.5">
                          {missingKinds.map((kind) => (
                            <li
                              key={kind}
                              className="rounded-radius-sm bg-bg-warning px-2 py-0.5 text-xs text-text-warning"
                            >
                              {kindLabel(kind)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {missingKindCta && missingKinds.length > 0 ? (
                        <a
                          href={vaultHref}
                          className="inline-flex items-center justify-center rounded-radius bg-fill-primary px-3 py-2 text-sm font-medium text-on-primary"
                        >
                          {missingKindCta}
                        </a>
                      ) : null}
                      {page.vaultOpenCta ? (
                        <a
                          href={page.vaultOpenHref || "/student/evidence"}
                          className={
                            missingKindCta && missingKinds.length > 0
                              ? "inline-flex items-center justify-center rounded-radius border border-border px-3 py-2 text-sm font-medium text-text-primary"
                              : "inline-flex items-center justify-center rounded-radius bg-fill-primary px-3 py-2 text-sm font-medium text-on-primary"
                          }
                        >
                          {page.vaultOpenCta}
                        </a>
                      ) : null}
                    </div>
                  </div>
                ) : selected && requiredKinds.length > 0 ? (
                  <div className="space-y-3 border-t border-border pt-3">
                    {page.missingEvidenceLabel ? (
                      <p className="mb-1.5 font-mono text-[10px] uppercase text-text-warning">
                        {page.missingEvidenceLabel}
                      </p>
                    ) : null}
                    <ul className="flex flex-wrap gap-1.5">
                      {missingKinds.map((kind) => (
                        <li
                          key={kind}
                          className="rounded-radius-sm bg-bg-warning px-2 py-0.5 text-xs text-text-warning"
                        >
                          {kindLabel(kind)}
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-col gap-2">
                      {missingKindCta ? (
                        <a
                          href={anonymousHref}
                          className="inline-flex items-center justify-center rounded-radius bg-fill-primary px-3 py-2 text-sm font-medium text-on-primary"
                        >
                          {missingKindCta}
                        </a>
                      ) : null}
                      {page.anonymousUploadCta ? (
                        <a
                          href={anonymousHref}
                          className={
                            missingKindCta
                              ? "inline-flex items-center justify-center rounded-radius border border-border px-3 py-2 text-sm font-medium text-text-primary"
                              : "inline-flex items-center justify-center rounded-radius bg-fill-primary px-3 py-2 text-sm font-medium text-on-primary"
                          }
                        >
                          {page.anonymousUploadCta}
                        </a>
                      ) : null}
                    </div>
                    {page.signInPrompt ? (
                      <p className="text-sm text-text-secondary">
                        {page.signInPrompt}{" "}
                        {page.signInCta ? (
                          <a
                            href="/sign-in?next=/visa-path"
                            className="font-medium text-fill-accent hover:underline"
                          >
                            {page.signInCta}
                          </a>
                        ) : null}
                      </p>
                    ) : null}
                  </div>
                ) : page.signInPrompt ? (
                  <p className="border-t border-border pt-3 text-sm text-text-secondary">
                    {page.signInPrompt}{" "}
                    {page.signInCta ? (
                      <a
                        href="/sign-in?next=/visa-path"
                        className="font-medium text-fill-accent hover:underline"
                      >
                        {page.signInCta}
                      </a>
                    ) : null}
                  </p>
                ) : null}
              </section>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
