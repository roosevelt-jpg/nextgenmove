"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui";
import { StudentWalletPanel } from "@/components/student/student-wallet-panel";
import { cn } from "@/lib/utils";

interface DashboardMatch {
  id: string;
  stageId: string;
  stageName: string;
  shortlisted: boolean;
  order?: number;
}

interface RecommendedItem {
  id: string;
  title: string;
  category: string;
  costCredits: number;
  priceEur?: number;
  type: string;
  purchased: boolean;
}

interface CreditWeek {
  label: string;
  earned: number;
  spent: number;
}

const JOURNEY = [
  { key: "applied", match: /new|applied|intro/i },
  { key: "shortlisted", match: /shortlist/i },
  { key: "interviewing", match: /interview/i },
  { key: "placed", match: /placed|offer/i },
] as const;

export interface StudentDashboardViewProps {
  labels: Record<string, string>;
}

export function StudentDashboardView({ labels }: StudentDashboardViewProps) {
  const [credits, setCredits] = useState(0);
  const [profileCompleteness, setProfileCompleteness] = useState(0);
  const [matches, setMatches] = useState<DashboardMatch[]>([]);
  const [recommendedContent, setRecommendedContent] = useState<RecommendedItem[]>([]);
  const [creditActivity, setCreditActivity] = useState<CreditWeek[]>([]);
  const [earnSpendDeltaPct, setEarnSpendDeltaPct] = useState(0);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemMessage, setRedeemMessage] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    const response = await fetch("/api/student/dashboard");
    if (!response.ok) return;
    const data = (await response.json()) as {
      credits: number;
      profileCompleteness: number;
      matches: DashboardMatch[];
      recommendedContent: RecommendedItem[];
      creditActivity: CreditWeek[];
      earnSpendDeltaPct: number;
    };
    setCredits(data.credits);
    setProfileCompleteness(data.profileCompleteness);
    setMatches(data.matches);
    setRecommendedContent(data.recommendedContent);
    setCreditActivity(data.creditActivity ?? []);
    setEarnSpendDeltaPct(data.earnSpendDeltaPct ?? 0);
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const currentStageName = useMemo(() => {
    if (!matches.length) return labels.stageEmpty ?? "Applied";
    const ordered = [...matches].sort(
      (a, b) => (b.order ?? 0) - (a.order ?? 0),
    );
    return ordered[0]?.stageName || labels.stageEmpty || "Applied";
  }, [matches, labels.stageEmpty]);

  const journeyIndex = useMemo(() => {
    const name = currentStageName.toLowerCase();
    if (/placed/.test(name)) return 3;
    if (/interview/.test(name)) return 2;
    if (/shortlist/.test(name) || matches.some((m) => m.shortlisted)) return 1;
    return 0;
  }, [currentStageName, matches]);

  const featured = recommendedContent[0] ?? null;

  const redeem = async () => {
    if (!featured || featured.purchased) return;
    setRedeeming(true);
    setRedeemMessage(null);
    const response = await fetch("/api/student/store/purchase", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({ contentItemId: featured.id }),
    });
    setRedeeming(false);
    if (response.ok) {
      setRedeemMessage(labels.redeemSuccess ?? "Unlocked.");
      await loadDashboard();
      return;
    }
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    setRedeemMessage(
      labels[payload?.error ?? ""] ??
        labels.redeemError ??
        payload?.error ??
        "Could not redeem.",
    );
  };

  const maxBar = Math.max(
    1,
    ...creditActivity.flatMap((w) => [w.earned, w.spent]),
  );

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-6">
      <header className="space-y-1">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-label">
          {labels.eyebrow ?? "Dashboard"}
        </p>
        <h1 className="font-serif text-[clamp(1.5rem,3vw,2.125rem)] font-semibold leading-tight text-text-primary">
          {labels.title ?? "Your next step starts here."}
        </h1>
        {labels.subtitle ? (
          <p className="max-w-xl text-sm text-text-secondary">{labels.subtitle}</p>
        ) : null}
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-radius border border-border bg-grad-card px-4 py-3.5">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
            {labels.creditsLabel ?? "Credit balance"}
          </p>
          <p className="mt-1 font-serif text-[1.65rem] font-semibold text-fill-accent">
            {credits.toLocaleString()}
          </p>
        </div>
        <div className="rounded-radius border border-border bg-grad-card px-4 py-3.5">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
            {labels.profileCompletenessLabel ?? "Profile complete"}
          </p>
          <p className="mt-1 font-serif text-[1.65rem] font-semibold text-text-success">
            {profileCompleteness}%
          </p>
        </div>
        <div className="rounded-radius border border-border bg-grad-card px-4 py-3.5">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
            {labels.stageLabel ?? "Stage"}
          </p>
          <p className="mt-1 font-serif text-[1.65rem] font-semibold text-text-primary">
            {currentStageName}
          </p>
        </div>
      </section>

      <StudentWalletPanel labels={labels} compact historyLimit={50} />

      <section className="rounded-radius border border-border bg-grad-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[14px] font-semibold text-text-primary">
            {labels.creditActivityTitle ?? "Credit activity, last 8 weeks"}
          </h2>
          <div className="flex gap-3 text-[11px] text-text-secondary">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-text-success" />
              {labels.earnedLegend ?? "Earned"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-fill-accent" />
              {labels.spentLegend ?? "Spent"}
            </span>
          </div>
        </div>
        <div className="flex h-40 items-center gap-2">
          {creditActivity.map((week) => (
            <div
              key={week.label}
              className="flex flex-1 flex-col items-center justify-center gap-0"
            >
              <div className="flex h-16 w-full flex-col items-center justify-end">
                <div
                  className="w-3 rounded-t-sm bg-text-success"
                  style={{
                    height: `${(week.earned / maxBar) * 100}%`,
                    minHeight: week.earned ? 4 : 0,
                  }}
                />
              </div>
              <div className="h-px w-full bg-border" />
              <div className="flex h-16 w-full flex-col items-center justify-start">
                <div
                  className="w-3 rounded-b-sm bg-fill-accent"
                  style={{
                    height: `${(week.spent / maxBar) * 100}%`,
                    minHeight: week.spent ? 4 : 0,
                  }}
                />
              </div>
              <p className="mt-1 font-mono text-[9px] text-text-muted">
                {week.label}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[12px] text-text-success">
          ▲{" "}
          {(labels.earnSpendDelta ?? "{pct}% more earned than spent this month").replace(
            "{pct}",
            String(Math.abs(earnSpendDeltaPct)),
          )}
        </p>
      </section>

      <section className="rounded-radius border border-border bg-grad-card p-4">
        <h2 className="mb-5 text-[14px] font-semibold text-text-primary">
          {labels.pipelineTitle ?? "Your placement journey"}
        </h2>
        <ol className="flex items-start justify-between gap-2">
          {JOURNEY.map((step, index) => {
            const done = index < journeyIndex;
            const current = index === journeyIndex;
            const labelKey = `journey_${step.key}` as const;
            return (
              <li key={step.key} className="relative flex flex-1 flex-col items-center">
                {index < JOURNEY.length - 1 ? (
                  <span
                    className={cn(
                      "absolute left-1/2 top-4 h-0.5 w-full",
                      index < journeyIndex
                        ? "bg-text-success"
                        : index === journeyIndex
                          ? "bg-fill-accent"
                          : "bg-border",
                    )}
                    aria-hidden
                  />
                ) : null}
                <span
                  className={cn(
                    "relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold",
                    done
                      ? "bg-text-success text-on-primary"
                      : current
                        ? "bg-fill-accent text-on-accent"
                        : "bg-surface-2 text-text-muted",
                  )}
                >
                  {done ? "✓" : index + 1}
                </span>
                <p className="mt-2 text-center text-[12px] font-medium text-text-primary">
                  {labels[labelKey] ??
                    step.key.charAt(0).toUpperCase() + step.key.slice(1)}
                </p>
              </li>
            );
          })}
        </ol>
      </section>

      {featured ? (
        <section className="rounded-radius border border-border bg-grad-card p-4">
          <h2 className="mb-3 text-[14px] font-semibold text-text-primary">
            {labels.recommendedTitle ?? "Recommended next step"}
          </h2>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-text-primary">{featured.title}</p>
              <p className="text-[12.5px] text-text-secondary">
                {featured.category}
                {featured.costCredits
                  ? ` · ${featured.costCredits} credits`
                  : ""}
                {featured.priceEur != null ? ` (€${featured.priceEur})` : ""}
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              disabled={featured.purchased || redeeming}
              onClick={() => void redeem()}
            >
              {featured.purchased
                ? labels.unlockedLabel ?? "Unlocked"
                : labels.redeem ?? "Redeem"}
            </Button>
          </div>
          {redeemMessage ? (
            <p className="mt-2 text-sm text-text-secondary" role="status">
              {redeemMessage}
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
