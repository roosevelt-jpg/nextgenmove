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

interface ApplicationItem {
  id: string;
  jobPostingId: string | null;
  jobTitle: string;
  companyName: string;
  applicationStatus: string;
  createdAt: string | null;
}

export function StudentApplicationsView({
  labels,
}: {
  labels: Record<string, string>;
}) {
  const [items, setItems] = useState<ApplicationItem[]>([]);
  const [filters, setFilters] = useState<Record<string, AdvancedFilterValue>>({
    search: "",
    status: "",
  });

  const load = useCallback(async () => {
    const res = await fetch("/api/student/applications");
    if (!res.ok) return;
    const data = (await res.json()) as { items?: ApplicationItem[] };
    setItems(data.items ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const statusOptions = useMemo(
    () => uniqueOptionValues(items.map((i) => i.applicationStatus)),
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
        id: "status",
        type: "select",
        labelKey: "filterStatus",
        allKey: "filterAll",
        options: statusOptions,
      },
    ],
    [statusOptions],
  );

  const filtered = useMemo(
    () =>
      applyClientFilters(items, {
        search: {
          value: filters.search,
          accessors: [
            (row) => row.jobTitle,
            (row) => row.companyName,
            (row) => row.applicationStatus,
          ],
        },
        equals: [
          { value: filters.status, accessor: (row) => row.applicationStatus },
        ],
      }),
    [items, filters],
  );

  const statusLabel = (status: string) =>
    labels[`status_${status}`] || status;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-serif text-2xl text-text-primary">
          {labels.title || "Applied jobs"}
        </h1>
        {labels.subtitle ? (
          <p className="text-sm text-text-secondary">{labels.subtitle}</p>
        ) : null}
        <Link
          href="/student/jobs"
          className="inline-block text-sm font-medium text-text-label hover:text-fill-accent"
        >
          {labels.openJobBoard || "Browse jobs →"}
        </Link>
      </header>

      <AdvancedFilters
        labels={{
          ...labels,
          search: labels.search || "Search",
          searchPlaceholder: labels.searchPlaceholder || "Search applications…",
          filterStatus: labels.filterStatus || "Status",
          filterAll: labels.filterAll || "All",
          clearFilters: labels.clearFilters || "Clear filters",
        }}
        fields={fields}
        values={filters}
        onChange={setFilters}
        clearKey="clearFilters"
      />

      {filtered.length === 0 ? (
        <EmptyState title={labels.empty || "You have not applied to any jobs yet."} />
      ) : (
        <ul className="divide-y divide-border rounded-radius border border-border">
          {filtered.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <p className="font-medium text-text-primary">
                  {item.jobTitle || labels.jobTitleLabel || "Role"}
                </p>
                <p className="text-sm text-text-secondary">
                  {item.companyName}
                  {item.createdAt
                    ? ` · ${new Date(item.createdAt).toLocaleDateString()}`
                    : ""}
                </p>
              </div>
              <span className="rounded-radius bg-bg-tag px-2 py-0.5 text-xs font-medium text-text-tag">
                {statusLabel(item.applicationStatus)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
