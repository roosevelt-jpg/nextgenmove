"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminPromoteModal } from "@/components/admin/admin-promote-modal";
import { Button, EmptyState, StatCard } from "@/components/ui";
import type { AdminDashboardStats, ActivityLogEntry, PendingRequestItem } from "@/lib/admin/dashboard";

interface AdminDashboardViewProps {
  labels: Record<string, string>;
  initialStats: AdminDashboardStats;
  initialActivity: ActivityLogEntry[];
  initialPending: PendingRequestItem[];
}

const VALUE_TONES = [
  "text-fill-accent",
  "text-text-accent",
  "text-text-success",
  "text-text-primary",
  "text-text-label",
] as const;

export function AdminDashboardView({
  labels,
  initialStats,
  initialActivity,
  initialPending,
}: AdminDashboardViewProps) {
  const [stats, setStats] = useState(initialStats);
  const [activity, setActivity] = useState(initialActivity);
  const [pending, setPending] = useState(initialPending);
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [promoteItem, setPromoteItem] = useState<PendingRequestItem | null>(null);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [stages, setStages] = useState<{ id: string; name: string }[]>([]);

  const refreshLiveData = useCallback(async () => {
    const [statsRes, activityRes, pendingRes] = await Promise.all([
      fetch("/api/admin/dashboard/stats"),
      fetch("/api/admin/activity?limit=20"),
      fetch("/api/admin/pending-requests"),
    ]);

    if (statsRes.ok) {
      const payload = (await statsRes.json()) as { stats: AdminDashboardStats };
      setStats(payload.stats);
    }

    if (activityRes.ok) {
      const payload = (await activityRes.json()) as { items: ActivityLogEntry[] };
      setActivity(payload.items);
    }

    if (pendingRes.ok) {
      const payload = (await pendingRes.json()) as { items: PendingRequestItem[] };
      setPending(payload.items);
    }
  }, []);

  useEffect(() => {
    const interval = window.setInterval(refreshLiveData, 15000);
    return () => window.clearInterval(interval);
  }, [refreshLiveData]);

  const openPromote = async (item: PendingRequestItem) => {
    const [companiesRes, stagesRes] = await Promise.all([
      fetch("/api/admin/crm/companies"),
      fetch("/api/admin/data/pipeline_stages"),
    ]);

    if (companiesRes.ok) {
      const payload = (await companiesRes.json()) as {
        items: { id: string; name?: string }[];
      };
      setCompanies(
        payload.items.map((company) => ({
          id: company.id,
          name: company.name ?? company.id,
        })),
      );
    }

    if (stagesRes.ok) {
      const payload = (await stagesRes.json()) as {
        items: { id: string; name?: string }[];
      };
      setStages(
        payload.items.map((stage) => ({
          id: stage.id,
          name: stage.name ?? stage.id,
        })),
      );
    }

    setPromoteItem(item);
  };

  const runAction = async (
    item: PendingRequestItem,
    action: "approve" | "reject" | "promote" | "dismiss",
  ) => {
    setActionLoadingId(`${item.source}:${item.id}`);

    const response = await fetch(`/api/admin/pending-requests/${item.source}/${item.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    setActionLoadingId(null);

    if (response.ok) {
      await refreshLiveData();
    }
  };

  const filteredPending =
    sourceFilter === "all"
      ? pending
      : pending.filter((item) => item.source === sourceFilter);

  const statCards = [
    { key: "activeCompanies", value: stats.activeCompanies },
    { key: "activeStudents", value: stats.activeStudents },
    { key: "openPipelineMatches", value: stats.openPipelineMatches },
    { key: "pendingRequestsCount", value: stats.pendingRequestsCount },
    { key: "liveContentItems", value: stats.liveContentItems },
  ];

  const sourceTabs = [
    { id: "all", label: labels.sourceAll },
    { id: "requests", label: labels.sourceRequests },
    { id: "job_applications", label: labels.sourceApplications },
    { id: "role_interest_submissions", label: labels.sourceInterest },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-3xl text-text-primary">{labels.title}</h1>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((card, index) =>
          labels[card.key] ? (
            <StatCard
              key={card.key}
              label={labels[card.key]}
              value={card.value}
              valueClassName={VALUE_TONES[index % VALUE_TONES.length]}
            />
          ) : null,
        )}
      </section>

      {(labels.contentLibraryTitle || labels.liveContentItems) && (
        <section className="flex flex-wrap items-center gap-3 rounded-radius border border-border bg-surface-1 px-5 py-4">
          {labels.contentLibraryTitle ? (
            <p className="font-serif text-lg text-text-primary">
              {labels.contentLibraryTitle}
            </p>
          ) : labels.liveContentItems ? (
            <p className="font-serif text-lg text-text-primary">
              {labels.liveContentItems}
            </p>
          ) : null}
          <span className="inline-flex items-center rounded-full bg-bg-success px-2.5 py-0.5 text-xs font-medium text-text-success">
            {stats.liveContentItems}
            {labels.contentLivePill ? ` · ${labels.contentLivePill}` : ""}
          </span>
          {labels.contentLibraryLink ? (
            <Link
              href="/admin/content"
              className="ml-auto text-sm font-medium text-text-label hover:text-fill-accent"
            >
              {labels.contentLibraryLink}
            </Link>
          ) : null}
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-radius border border-border bg-surface-1 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-serif text-xl text-text-primary">{labels.pendingTitle}</h2>
            {labels.refresh ? (
              <Button variant="ghost" size="sm" onClick={refreshLiveData}>
                {labels.refresh}
              </Button>
            ) : null}
          </div>

          <div className="mb-4 flex flex-wrap gap-2 border-b border-border pb-3">
            {sourceTabs.map((tab) => {
              if (!tab.label) {
                return null;
              }

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSourceFilter(tab.id)}
                  className={
                    sourceFilter === tab.id
                      ? "-mb-px border-b-2 border-fill-primary pb-2 text-sm font-bold text-text-primary"
                      : "pb-2 text-sm text-text-muted hover:text-text-secondary"
                  }
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {filteredPending.length === 0 ? (
            <EmptyState title={labels.pendingEmpty} />
          ) : (
            <ul className="divide-y divide-border">
              {filteredPending.map((item) => {
                const rowKey = `${item.source}:${item.id}`;
                const isLoading = actionLoadingId === rowKey;

                return (
                  <li
                    key={rowKey}
                    className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-text-primary">{item.title}</p>
                      <p className="text-sm text-text-muted">{item.subtitle}</p>
                      <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-text-label">
                        {labels[`source_${item.source}`] ?? item.source}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isLoading}
                        onClick={() => runAction(item, "approve")}
                      >
                        {labels.approve}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isLoading}
                        onClick={() => runAction(item, "reject")}
                      >
                        {labels.reject}
                      </Button>
                      {item.source === "role_interest_submissions" ? (
                        <Button
                          size="sm"
                          disabled={isLoading}
                          onClick={() => openPromote(item)}
                        >
                          {labels.promote}
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-radius border border-border bg-surface-1 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-serif text-xl text-text-primary">{labels.activityTitle}</h2>
              {labels.leversLink ? (
                <Link
                  href="/admin/levers"
                  className="text-sm font-medium text-text-label hover:text-fill-accent"
                >
                  {labels.leversLink}
                </Link>
              ) : null}
            </div>
            {activity.length === 0 ? (
              <EmptyState title={labels.activityEmpty} />
            ) : (
              <ul className="divide-y divide-border">
                {activity.map((entry) => (
                  <li key={entry.id} className="py-3">
                    <p className="text-sm text-text-primary">{entry.action}</p>
                    <p className="text-xs text-text-muted">
                      {entry.targetType} · {entry.targetId}
                    </p>
                    {entry.createdAt ? (
                      <p className="text-xs text-text-muted">{entry.createdAt}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {labels.leversPanelTitle ? (
            <div className="rounded-radius border border-border-accent bg-brand-lavender p-5">
              <h2 className="font-serif text-xl text-fill-accent">
                {labels.leversPanelTitle}
              </h2>
              {labels.leversPanelBody ? (
                <p className="mt-2 text-sm text-text-secondary">{labels.leversPanelBody}</p>
              ) : null}
              {labels.leversLink ? (
                <Link
                  href="/admin/levers"
                  className="mt-4 inline-flex items-center justify-center rounded-radius bg-fill-primary px-4 py-2 text-sm font-medium text-on-primary hover:opacity-90"
                >
                  {labels.leversLink}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <AdminPromoteModal
        open={Boolean(promoteItem)}
        item={promoteItem}
        labels={labels}
        companies={companies}
        stages={stages}
        onClose={() => setPromoteItem(null)}
        onPromoted={refreshLiveData}
      />
    </div>
  );
}
