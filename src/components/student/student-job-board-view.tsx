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
  companyName: string;
  location: string;
  salary: string;
  employmentType: string;
  categories: string[];
}

export function StudentJobBoardView({ labels }: { labels: Record<string, string> }) {
  const [items, setItems] = useState<JobCard[]>([]);
  const [filters, setFilters] = useState<Record<string, AdvancedFilterValue>>({
    search: "",
    type: "",
    salary: "",
    category: "",
  });

  const load = useCallback(async () => {
    const res = await fetch("/api/student/jobs");
    if (!res.ok) return;
    const data = (await res.json()) as { items?: JobCard[] };
    setItems(data.items ?? []);
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

  const salaryOptions = useMemo(
    () => uniqueOptionValues(items.map((i) => i.salary)),
    [items],
  );

  const categoryOptions = useMemo(
    () => uniqueOptionValues(items.flatMap((i) => i.categories ?? [])),
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
        id: "type",
        type: "select",
        labelKey: "filterType",
        allKey: "filterAll",
        options: typeOptions,
      },
      {
        id: "salary",
        type: "select",
        labelKey: "filterSalary",
        allKey: "filterAll",
        options: salaryOptions,
      },
      {
        id: "category",
        type: "select",
        labelKey: "filterCategory",
        allKey: "filterAll",
        options: categoryOptions,
      },
    ],
    [typeOptions, salaryOptions, categoryOptions],
  );

  const filtered = useMemo(
    () =>
      applyClientFilters(items, {
        search: {
          value: filters.search,
          accessors: [
            (job) => job.title,
            (job) => job.location,
            (job) => job.companyName,
            (job) => job.categories,
          ],
        },
        equals: [
          { value: filters.type, accessor: (job) => job.employmentType },
          { value: filters.salary, accessor: (job) => job.salary },
          {
            value: filters.category,
            accessor: (job) =>
              filters.category &&
              (job.categories ?? []).includes(String(filters.category))
                ? String(filters.category)
                : "",
          },
        ],
      }),
    [items, filters],
  );

  const typeLabel = (value: string) =>
    typeOptions.find((o) => o.value === value)?.label || value;

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="font-serif text-2xl text-text-primary">
          {labels.title || "Job board"}
        </h1>
        {labels.subtitle ? (
          <p className="text-sm text-text-secondary">{labels.subtitle}</p>
        ) : null}
      </header>

      <AdvancedFilters
        labels={{
          ...labels,
          search: labels.searchPlaceholder || "Search",
          searchPlaceholder:
            labels.searchPlaceholder || "Search by title or location",
          filterType: labels.filterType || "Job type",
          filterSalary: labels.filterSalary || "Salary",
          filterCategory: labels.filterCategory || "Category",
          filterAll: labels.filterAll || "All",
          clearFilters: labels.clearFilters || "Clear filters",
        }}
        fields={fields}
        values={filters}
        onChange={setFilters}
        clearKey="clearFilters"
      />

      {filtered.length === 0 ? (
        <EmptyState title={labels.empty || "No open jobs match your filters."} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {filtered.map((job) => (
            <li
              key={job.id}
              className="rounded-radius border border-border bg-grad-card p-4"
            >
              <h2 className="font-medium text-text-primary">{job.title}</h2>
              <p className="mt-1 text-sm text-text-secondary">
                {[job.companyName, job.location, typeLabel(job.employmentType)]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {job.salary ? (
                <p className="mt-1 text-sm text-text-primary">{job.salary}</p>
              ) : null}
              <div className="mt-3">
                <Link
                  href={`/student/jobs/${job.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-text-label hover:text-fill-accent"
                >
                  {labels.viewDetails || "View details"}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
