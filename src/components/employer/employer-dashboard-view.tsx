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
}

export interface EmployerDashboardViewProps {
  labels: Record<string, string>;
}

export function EmployerDashboardView({ labels }: EmployerDashboardViewProps) {
  const [data, setData] = useState<DashboardPayload | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/employer/dashboard");
    if (!response.ok) return;
    setData((await response.json()) as DashboardPayload);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!data) {
    return null;
  }

  const planLabel =
    data.company.plan === "track_a"
      ? labels.planTrackA
      : data.company.plan === "track_b"
        ? labels.planTrackB
        : labels.planNone;
  const statusLabel =
    labels[`subscription_${data.company.subscriptionStatus}`] ??
    data.company.subscriptionStatus;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        {labels.title ? (
          <h1 className="font-serif text-3xl text-text-primary">{labels.title}</h1>
        ) : null}
        {data.company.name ? (
          <p className="text-sm text-text-secondary">{data.company.name}</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {planLabel ? <Badge variant="accent">{planLabel}</Badge> : null}
          {statusLabel ? <Badge>{statusLabel}</Badge> : null}
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {labels.statTalentPool ? (
          <StatCard label={labels.statTalentPool} value={String(data.stats.talentPool)} />
        ) : null}
        {labels.statShortlisted ? (
          <StatCard
            label={labels.statShortlisted}
            value={String(data.stats.shortlisted)}
          />
        ) : null}
        {labels.statPipeline ? (
          <StatCard
            label={labels.statPipeline}
            value={String(data.stats.inPipeline)}
          />
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {labels.openTalentPool ? (
          <Card>
            <CardBody>
              <Link
                href="/employer/talent-pool"
                className="font-medium text-text-primary hover:underline"
              >
                {labels.openTalentPool}
              </Link>
            </CardBody>
          </Card>
        ) : null}
        {labels.openPipeline ? (
          <Card>
            <CardBody>
              <Link
                href="/employer/pipeline"
                className="font-medium text-text-primary hover:underline"
              >
                {labels.openPipeline}
              </Link>
            </CardBody>
          </Card>
        ) : null}
        {labels.openProfile ? (
          <Card>
            <CardBody>
              <Link
                href="/employer/profile"
                className="font-medium text-text-primary hover:underline"
              >
                {labels.openProfile}
              </Link>
            </CardBody>
          </Card>
        ) : null}
      </div>

      <PortalVideosSection apiPath="/api/employer/videos" labels={labels} />
    </div>
  );
}
