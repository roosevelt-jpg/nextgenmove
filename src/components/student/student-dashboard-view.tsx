"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Card, CardBody, StatCard } from "@/components/ui";
import { cn } from "@/lib/utils";

interface DashboardMatch {
  id: string;
  stageId: string;
  stageName: string;
  shortlisted: boolean;
}

interface RecommendedItem {
  id: string;
  title: string;
  category: string;
  costCredits: number;
  type: string;
  purchased: boolean;
}

export interface StudentDashboardViewProps {
  labels: Record<string, string>;
}

const VALUE_TONES = [
  "text-fill-accent",
  "text-text-accent",
  "text-text-success",
] as const;

export function StudentDashboardView({ labels }: StudentDashboardViewProps) {
  const [credits, setCredits] = useState(0);
  const [profileCompleteness, setProfileCompleteness] = useState(0);
  const [matches, setMatches] = useState<DashboardMatch[]>([]);
  const [recommendedContent, setRecommendedContent] = useState<RecommendedItem[]>([]);

  const loadDashboard = useCallback(async () => {
    const response = await fetch("/api/student/dashboard");
    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as {
      credits: number;
      profileCompleteness: number;
      matches: DashboardMatch[];
      recommendedContent: RecommendedItem[];
    };

    setCredits(data.credits);
    setProfileCompleteness(data.profileCompleteness);
    setMatches(data.matches);
    setRecommendedContent(data.recommendedContent);
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const journeySteps = useMemo(() => {
    const seen = new Set<string>();
    const steps: { id: string; name: string; shortlisted: boolean }[] = [];

    for (const match of matches) {
      const key = match.stageId || match.stageName;
      if (!key || seen.has(key)) {
        continue;
      }
      seen.add(key);
      steps.push({
        id: key,
        name: match.stageName || match.stageId,
        shortlisted: match.shortlisted,
      });
    }

    return steps;
  }, [matches]);

  const featuredRedeem = recommendedContent[0] ?? null;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {labels.creditsLabel ? (
          <StatCard
            label={labels.creditsLabel}
            value={String(credits)}
            valueClassName={VALUE_TONES[0]}
          />
        ) : null}
        {labels.profileCompletenessLabel ? (
          <StatCard
            label={labels.profileCompletenessLabel}
            value={
              labels.profileCompletenessValue
                ? labels.profileCompletenessValue.replace(
                    "{percent}",
                    String(profileCompleteness),
                  )
                : String(profileCompleteness)
            }
            valueClassName={VALUE_TONES[1]}
          />
        ) : null}
        {labels.matchesLabel ? (
          <StatCard
            label={labels.matchesLabel}
            value={String(matches.length)}
            valueClassName={VALUE_TONES[2]}
          />
        ) : null}
      </div>

      {journeySteps.length ? (
        <section className="space-y-4">
          {labels.pipelineTitle ? (
            <h2 className="font-serif text-2xl text-text-primary">{labels.pipelineTitle}</h2>
          ) : null}
          <ol className="flex flex-wrap items-start gap-0 rounded-radius border border-border bg-surface-1 p-5 sm:p-6">
            {journeySteps.map((step, index) => (
              <li
                key={step.id}
                className="flex min-w-0 flex-1 items-start gap-0"
              >
                <div className="flex min-w-[5.5rem] flex-col items-center text-center sm:min-w-[7rem]">
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold",
                      step.shortlisted || index === journeySteps.length - 1
                        ? "border-fill-accent bg-fill-accent text-on-accent"
                        : "border-border-accent bg-brand-lavender text-fill-accent",
                    )}
                  >
                    {index + 1}
                  </span>
                  <p className="mt-2 text-sm font-medium text-text-primary">{step.name}</p>
                  {step.shortlisted && labels.shortlistedBadge ? (
                    <Badge variant="accent" className="mt-2">
                      {labels.shortlistedBadge}
                    </Badge>
                  ) : null}
                </div>
                {index < journeySteps.length - 1 ? (
                  <div
                    className="mt-4 h-0.5 min-w-4 flex-1 bg-border-accent"
                    aria-hidden="true"
                  />
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ) : matches.length ? (
        <section className="space-y-4">
          {labels.pipelineTitle ? (
            <h2 className="font-serif text-2xl text-text-primary">{labels.pipelineTitle}</h2>
          ) : null}
          <ul className="space-y-3">
            {matches.map((match) => (
              <li
                key={match.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-radius border border-border bg-surface-1 p-4"
              >
                <div>
                  {match.stageName ? (
                    <p className="font-medium text-text-primary">{match.stageName}</p>
                  ) : null}
                  {match.shortlisted && labels.shortlistedBadge ? (
                    <Badge variant="accent" className="mt-2">
                      {labels.shortlistedBadge}
                    </Badge>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {featuredRedeem ? (
        <section className="space-y-4">
          {labels.recommendedTitle ? (
            <h2 className="font-serif text-2xl text-text-primary">{labels.recommendedTitle}</h2>
          ) : null}
          <Card className="overflow-hidden border-border-accent">
            <CardBody className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-radius bg-brand-lavender font-serif text-lg font-semibold text-fill-accent"
                  aria-hidden="true"
                >
                  {initialsFromTitle(featuredRedeem.title)}
                </span>
                <div className="min-w-0 space-y-1">
                  <p className="font-serif text-xl text-text-primary">{featuredRedeem.title}</p>
                  {featuredRedeem.category ? (
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-text-label">
                      {featuredRedeem.category}
                    </p>
                  ) : null}
                  {labels.costCreditsLabel ? (
                    <p className="font-mono text-sm text-text-accent">
                      {labels.costCreditsLabel.replace(
                        "{credits}",
                        String(featuredRedeem.costCredits),
                      )}
                    </p>
                  ) : null}
                  {featuredRedeem.purchased && labels.unlockedLabel ? (
                    <Badge variant="success">{labels.unlockedLabel}</Badge>
                  ) : null}
                </div>
              </div>
              {labels.viewInStore ? (
                <Link
                  href="/student/store"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-radius bg-fill-primary px-4 py-2 text-sm font-medium text-on-primary hover:opacity-90"
                >
                  {labels.viewInStore}
                </Link>
              ) : null}
            </CardBody>
          </Card>
          {recommendedContent.length > 1 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recommendedContent.slice(1).map((item) => (
                <Card key={item.id}>
                  <CardBody className="space-y-2">
                    <div className="flex items-start gap-3">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-radius bg-surface-2 font-serif text-sm font-semibold text-fill-accent"
                        aria-hidden="true"
                      >
                        {initialsFromTitle(item.title)}
                      </span>
                      <div className="min-w-0 space-y-1">
                        <p className="font-medium text-text-primary">{item.title}</p>
                        {item.category ? (
                          <p className="text-xs text-text-muted">{item.category}</p>
                        ) : null}
                        {labels.costCreditsLabel ? (
                          <p className="font-mono text-xs text-text-accent">
                            {labels.costCreditsLabel.replace(
                              "{credits}",
                              String(item.costCredits),
                            )}
                          </p>
                        ) : null}
                        {item.purchased && labels.unlockedLabel ? (
                          <Badge variant="success">{labels.unlockedLabel}</Badge>
                        ) : null}
                        {labels.viewInStore ? (
                          <Link
                            href="/student/store"
                            className="text-sm text-text-secondary hover:text-text-primary"
                          >
                            {labels.viewInStore}
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function initialsFromTitle(title: string): string {
  const parts = title.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return "";
  }
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}
