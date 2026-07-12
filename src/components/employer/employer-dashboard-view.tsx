"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Card, CardBody, StatCard } from "@/components/ui";
import { PortalVideosSection } from "@/components/portal/portal-videos-section";

interface DashboardPayload {
  company: {
    name: string;
    plan: "track_a" | "track_b" | null;
    subscriptionStatus: "active" | "inactive" | "pending";
  };
  stats: {
    talentPool: number;
    shortlisted: number;
    inPipeline: number;
  };
  degraded?: boolean;
}

export interface EmployerDashboardViewProps {
  labels: Record<string, string>;
}

export function EmployerDashboardView({ labels }: EmployerDashboardViewProps) {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/employer/dashboard");
      if (!response.ok) {
        setError(labels.loadError || "Could not load dashboard.");
        setData(null);
        return;
      }
      setData((await response.json()) as DashboardPayload);
    } catch {
      setError(labels.loadError || "Could not load dashboard.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [labels.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !data) {
    return (
      <p className="text-sm text-text-secondary">
        {labels.loading || "Loading…"}
      </p>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-text-warning" role="alert">
          {error}
        </p>
        <button
          type="button"
          className="text-sm font-semibold text-fill-accent"
          onClick={() => void load()}
        >
          {labels.retry || "Retry"}
        </button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const planLabel =
    data.company.plan === "track_a"
      ? labels.planTrackA || "Track A"
      : data.company.plan === "track_b"
        ? labels.planTrackB || "Track B"
        : labels.planNone || "No plan yet";
  const statusLabel =
    labels[`subscription_${data.company.subscriptionStatus}`] ||
    data.company.subscriptionStatus;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-serif text-2xl text-text-primary sm:text-3xl">
          {labels.title || "Employer dashboard"}
        </h1>
        {data.company.name ? (
          <p className="text-sm text-text-secondary">{data.company.name}</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Badge variant="accent">{planLabel}</Badge>
          {statusLabel ? <Badge>{statusLabel}</Badge> : null}
        </div>
        {data.degraded ? (
          <p className="text-xs text-text-muted">
            {labels.degradedWarning ||
              "Live match stats are temporarily unavailable."}
          </p>
        ) : null}
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label={labels.statTalentPool || "Talent pool"}
          value={String(data.stats.talentPool)}
        />
        <StatCard
          label={labels.statShortlisted || "Shortlisted"}
          value={String(data.stats.shortlisted)}
        />
        <StatCard
          label={labels.statPipeline || "In pipeline"}
          value={String(data.stats.inPipeline)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardBody>
            <Link
              href="/employer/talent-pool"
              className="font-medium text-text-primary hover:underline"
            >
              {labels.openTalentPool || "Open talent pool →"}
            </Link>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Link
              href="/employer/pipeline"
              className="font-medium text-text-primary hover:underline"
            >
              {labels.openPipeline || "Open pipeline →"}
            </Link>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Link
              href="/employer/profile"
              className="font-medium text-text-primary hover:underline"
            >
              {labels.openProfile || "Manage plan & profile →"}
            </Link>
          </CardBody>
        </Card>
      </div>

      <PortalVideosSection
        apiPath="/api/employer/videos"
        labels={{
          videosTitle: labels.videosTitle || "Private video materials",
          videosSubtitle:
            labels.videosSubtitle ||
            "Exclusive route briefings for active Track A and Track B subscribers.",
          videosLocked:
            labels.videosLocked ||
            "Unlock with an active Track A or Track B subscription.",
        }}
      />
    </div>
  );
}
