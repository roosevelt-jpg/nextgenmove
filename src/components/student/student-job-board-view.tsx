"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AdvancedFilters,
  EmptyState,
  type AdvancedFilterField,
  type AdvancedFilterValue,
} from "@/components/ui";
import { applyClientFilters, uniqueOptionValues } from "@/lib/filters/apply-client-filters";

interface JobCard {
  id: string;
  title: string;
  employerLabel: string;
  location: string;
  salary: string;
  employmentType: string;
  department?: string;
  skills: string[];
  categories: string[];
  postedAt?: string | null;
  companyIdentityUnlocked?: boolean;
}

export function StudentJobBoardView({ labels }: { labels: Record<string, string> }) {
  const [items, setItems] = useState<JobCard[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [filters, setFilters] = useState<Record<string, AdvancedFilterValue>>({
    search: "",
    location: "",
    type: "",
    skill: "",
  });

  const load = useCallback(async () => {
    setStatus("loading");
    const res = await fetch("/api/student/jobs");
    if (!res.ok) {
      setStatus("error");
      return;
    }
    const data = (await res.json()) as { items?: JobCard[] };
    setItems(data.items ?? []);
    setStatus("ready");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const typeOptions = useMemo(
    () => [
      { value: "full_time", label: labels.typeFullTime || "Full time" },
      { value: "part_time", label: labels.typePartTime || "Part time" },
      { value: "internship", label: labels.typeInternship || "Internship" },
      { value: "freelance", label: labels.typeFreelance || "Freelance" },
    ],
    [labels],
  );

  const locationOptions = useMemo(
    () => uniqueOptionValues(items.map((i) => i.location)),
    [items],
  );

  const skillOptions = useMemo(
    () => uniqueOptionValues(items.flatMap((i) => i.skills ?? [])),
    [items],
  );

  const fields = useMemo<AdvancedFilterField[]>(
    () => [
      {
        id: "search",
        type: "search",
        labelKey: "search",
        placeholderKey: "searchPlaceholder",
      },
      {
        id: "location",
        type: "select",
        labelKey: "filterLocation",
        allKey: "filterAll",
        options: locationOptions,
      },
      {
        id: "type",
        type: "select",
        labelKey: "filterType",
        allKey: "filterAll",
        options: typeOptions,
      },
      {
        id: "skill",
        type: "select",
        labelKey: "filterSkill",
        allKey: "filterAll",
        options: skillOptions,
      },
    ],
    [typeOptions, locationOptions, skillOptions],
  );

  const filtered = useMemo(
    () =>
      applyClientFilters(items, {
        search: {
          value: filters.search,
          accessors: [
            (job) => job.title,
            (job) => job.location,
            (job) => job.employerLabel,
            (job) => job.skills,
            (job) => job.categories,
            (job) => job.department,
          ],
        },
        equals: [
          { value: filters.location, accessor: (job) => job.location },
          { value: filters.type, accessor: (job) => job.employmentType },
          {
            value: filters.skill,
            accessor: (job) =>
              filters.skill &&
              (job.skills ?? []).includes(String(filters.skill))
                ? String(filters.skill)
                : "",
          },
        ],
      }),
    [items, filters],
  );

  const typeLabel = (value: string) =>
    typeOptions.find((o) => o.value === value)?.label || value;

  if (status === "loading") {
    return (
      <EmptyState title={labels.loading || labels.empty || ""} />
    );
  }

  if (status === "error") {
    return <EmptyState title={labels.loadError || labels.empty || ""} />;
  }

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        {labels.eyebrow ? (
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-label">
            {labels.eyebrow}
          </p>
        ) : null}
        <h1 className="font-serif text-2xl text-text-primary">
          {labels.title}
        </h1>
        {labels.subtitle ? (
          <p className="text-sm text-text-secondary">{labels.subtitle}</p>
        ) : null}
        {labels.maskedEmployerHint ? (
          <p className="text-xs text-text-muted">{labels.maskedEmployerHint}</p>
        ) : null}
      </header>

      <AdvancedFilters
        labels={{
          ...labels,
          search: labels.searchPlaceholder,
          searchPlaceholder: labels.searchPlaceholder,
          filterLocation: labels.filterLocation,
          filterType: labels.filterType,
          filterSkill: labels.filterSkill,
          filterAll: labels.filterAll,
          clearFilters: labels.clearFilters,
        }}
        fields={fields}
        values={filters}
        onChange={setFilters}
        clearKey="clearFilters"
      />

      {filtered.length === 0 ? (
        <EmptyState title={labels.empty || ""} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {filtered.map((job) => (
            <li
              key={job.id}
              className="rounded-radius border border-border bg-grad-card p-4"
            >
              <h2 className="font-medium text-text-primary">{job.title}</h2>
              <p className="mt-1 text-sm text-text-secondary">
                {[job.employerLabel, job.location, typeLabel(job.employmentType)]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {job.salary ? (
                <p className="mt-1 text-sm text-text-primary">{job.salary}</p>
              ) : null}
              {job.skills?.length ? (
                <ul className="mt-2 flex flex-wrap gap-1">
                  {job.skills.slice(0, 4).map((skill) => (
                    <li
                      key={skill}
                      className="rounded-radius bg-bg-tag px-2 py-0.5 text-[10px] text-text-tag"
                    >
                      {skill}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-3">
                <Link
                  href={`/student/jobs/${job.id}`}
                  className="text-sm font-medium text-text-label hover:text-fill-accent"
                >
                  {labels.viewDetails}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
