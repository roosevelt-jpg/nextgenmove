"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPromoteModal } from "@/components/admin/admin-promote-modal";
import { Button, EmptyState, StatCard } from "@/components/ui";
import type { AdminDashboardStats, ActivityLogEntry, PendingRequestItem } from "@/lib/admin/dashboard";

interface AdminDashboardViewProps {
  labels: Record<string, string>;
  initialStats: AdminDashboardStats;
  initialActivity: ActivityLogEntry[];
  initialPending: PendingRequestItem[];
}

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
        {statCards.map((card) => (
          <StatCard
            key={card.key}
            label={labels[card.key]}
            value={card.value}
          />
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-radius border border-border bg-surface-1 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-medium text-text-primary">{labels.pendingTitle}</h2>
            <Button variant="ghost" onClick={refreshLiveData}>
              {labels.refresh}
            </Button>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
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
                      ? "rounded-radius bg-surface-2 px-3 py-1 text-sm text-text-primary"
                      : "rounded-radius px-3 py-1 text-sm text-text-muted hover:text-text-secondary"
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
                  <li key={rowKey} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-text-primary">{item.title}</p>
                      <p className="text-sm text-text-muted">{item.subtitle}</p>
                      <p className="text-xs text-text-muted">
                        {labels[`source_${item.source}`] ?? item.source}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        disabled={isLoading}
                        onClick={() => runAction(item, "approve")}
                      >
                        {labels.approve}
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={isLoading}
                        onClick={() => runAction(item, "reject")}
                      >
                        {labels.reject}
                      </Button>
                      {item.source === "role_interest_submissions" ? (
                        <Button
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

        <div className="rounded-radius border border-border bg-surface-1 p-4">
          <h2 className="mb-4 font-medium text-text-primary">{labels.activityTitle}</h2>
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
