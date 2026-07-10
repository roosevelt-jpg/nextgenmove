"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Card, CardBody, StatCard } from "@/components/ui";

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

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {labels.creditsLabel ? (
          <StatCard
            label={labels.creditsLabel}
            value={String(credits)}
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
          />
        ) : null}
        {labels.matchesLabel ? (
          <StatCard label={labels.matchesLabel} value={String(matches.length)} />
        ) : null}
      </div>

      {matches.length ? (
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

      {recommendedContent.length ? (
        <section className="space-y-4">
          {labels.recommendedTitle ? (
            <h2 className="font-serif text-2xl text-text-primary">{labels.recommendedTitle}</h2>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recommendedContent.map((item) => (
              <Card key={item.id}>
                <CardBody className="space-y-2">
                  <p className="font-medium text-text-primary">{item.title}</p>
                  {item.category ? (
                    <p className="text-xs text-text-muted">{item.category}</p>
                  ) : null}
                  {labels.costCreditsLabel ? (
                    <p className="font-mono text-xs text-text-accent">
                      {labels.costCreditsLabel.replace("{credits}", String(item.costCredits))}
                    </p>
                  ) : null}
                  {item.purchased && labels.unlockedLabel ? (
                    <Badge variant="success">{labels.unlockedLabel}</Badge>
                  ) : null}
                  {labels.viewInStore ? (
                    <Link href="/student/store" className="text-sm text-text-secondary hover:text-text-primary">
                      {labels.viewInStore}
                    </Link>
                  ) : null}
                </CardBody>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
