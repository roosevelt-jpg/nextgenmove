"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "@/components/ui";

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

  const load = useCallback(async () => {
    const res = await fetch("/api/student/applications");
    if (!res.ok) return;
    const data = (await res.json()) as { items?: ApplicationItem[] };
    setItems(data.items ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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

      {items.length === 0 ? (
        <EmptyState title={labels.empty || "You have not applied to any jobs yet."} />
      ) : (
        <ul className="divide-y divide-border rounded-radius border border-border">
          {items.map((item) => (
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
