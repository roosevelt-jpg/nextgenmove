"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AdvancedFilters,
  Button,
  EmptyState,
  type AdvancedFilterField,
  type AdvancedFilterValue,
} from "@/components/ui";
import { applyClientFilters, uniqueOptionValues } from "@/lib/filters/apply-client-filters";

interface ApplicationItem {
  id: string;
  jobPostingId: string | null;
  jobTitle: string;
  employerLabel: string;
  companyName?: string;
  companyIdentityUnlocked?: boolean;
  companyUnlockStatus?: "none" | "pending" | "approved" | "declined";
  applicationStatus: string;
  createdAt: string | null;
}

export function StudentApplicationsView({
  labels,
}: {
  labels: Record<string, string>;
}) {
  const [items, setItems] = useState<ApplicationItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, AdvancedFilterValue>>({
    search: "",
    status: "",
  });

  const load = useCallback(async () => {
    setStatus("loading");
    const res = await fetch("/api/student/applications");
    if (!res.ok) {
      setStatus("error");
      return;
    }
    const data = (await res.json()) as { items?: ApplicationItem[] };
    setItems(data.items ?? []);
    setStatus("ready");
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
            (row) => row.employerLabel,
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

  const statusLabel = (applicationStatus: string) =>
    labels[`status_${applicationStatus}`] || applicationStatus;

  const revealEmployer = async (item: ApplicationItem) => {
    setBusyId(item.id);
    const res = await fetch("/api/student/company-unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matchId: item.id,
        jobPostingId: item.jobPostingId || undefined,
      }),
    });
    setBusyId(null);
    if (res.ok) await load();
  };

  if (status === "loading") {
    return <EmptyState title={labels.loading || ""} />;
  }
  if (status === "error") {
    return <EmptyState title={labels.loadError || ""} />;
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-serif text-2xl text-text-primary">
          {labels.title}
        </h1>
        {labels.subtitle ? (
          <p className="text-sm text-text-secondary">{labels.subtitle}</p>
        ) : null}
        <Link
          href="/student/jobs"
          className="inline-block text-sm font-medium text-text-label hover:text-fill-accent"
        >
          {labels.openJobBoard}
        </Link>
      </header>

      <AdvancedFilters
        labels={{
          ...labels,
          search: labels.search,
          searchPlaceholder: labels.searchPlaceholder,
          filterStatus: labels.filterStatus,
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
        <ul className="divide-y divide-border rounded-radius border border-border">
          {filtered.map((item) => {
            const unlocked =
              item.companyIdentityUnlocked === true ||
              item.companyUnlockStatus === "approved";
            const employer =
              unlocked && item.companyName
                ? item.companyName
                : item.employerLabel;

            return (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-text-primary">
                    {item.jobTitle || labels.jobTitleLabel}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {employer}
                    {item.createdAt
                      ? ` · ${new Date(item.createdAt).toLocaleDateString()}`
                      : ""}
                  </p>
                  {!unlocked && labels.maskedEmployerHint ? (
                    <p className="mt-1 text-[11px] text-text-muted">
                      {labels.maskedEmployerHint}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-radius bg-bg-tag px-2 py-0.5 text-xs font-medium text-text-tag">
                    {statusLabel(item.applicationStatus)}
                  </span>
                  {!unlocked ? (
                    item.companyUnlockStatus === "pending" ? (
                      <span className="rounded-radius border border-border px-2 py-0.5 text-xs text-text-secondary">
                        {labels.revealEmployerPending}
                      </span>
                    ) : labels.revealEmployerCta ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === item.id}
                        onClick={() => void revealEmployer(item)}
                      >
                        {labels.revealEmployerCta}
                      </Button>
                    ) : null
                  ) : labels.revealEmployerDone ? (
                    <span className="rounded-radius bg-bg-purple px-2 py-0.5 text-xs font-medium text-text-label">
                      {labels.revealEmployerDone}
                    </span>
                  ) : null}
                  {item.jobPostingId ? (
                    <Link
                      href={`/student/jobs/${item.jobPostingId}`}
                      className="text-xs font-medium text-text-label hover:text-fill-accent"
                    >
                      {labels.viewDetails}
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
