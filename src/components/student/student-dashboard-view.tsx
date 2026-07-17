"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui";
import { StudentWalletPanel } from "@/components/student/student-wallet-panel";
import { PortalVideosSection } from "@/components/portal/portal-videos-section";
import { cn } from "@/lib/utils";

interface PipelineStage {
  id: string;
  name: string;
  order: number;
  color: string;
}

interface DashboardMatch {
  id: string;
  stageId: string;
  stageName: string;
  stageColor?: string;
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

function hexToRgba(hex: string, alpha: number): string {
  const raw = hex.replace("#", "").trim();
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  if (full.length !== 6) return `rgba(75, 63, 156, ${alpha})`;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function ProfileCompletenessRing({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const r = 28;
  const c = 2 * Math.PI * r;
  const filled = (pct / 100) * c;
  const stroke =
    pct >= 80
      ? "var(--text-success)"
      : pct >= 40
        ? "var(--text-accent)"
        : "var(--fill-accent)";

  return (
    <div className="flex items-center gap-3">
      <div className="relative h-16 w-16 shrink-0">
        <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden>
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke="var(--border)"
            strokeWidth="6"
          />
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke={stroke}
            strokeWidth="6"
            strokeDasharray={`${filled} ${c - filled}`}
            strokeLinecap="round"
            transform="rotate(-90 32 32)"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-serif text-sm font-semibold text-text-primary">
          {pct}%
        </span>
      </div>
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
        {label}
      </p>
    </div>
  );
}

export interface StudentDashboardViewProps {
  labels: Record<string, string>;
}

export function StudentDashboardView({ labels }: StudentDashboardViewProps) {
  const [credits, setCredits] = useState(0);
  const [profileCompleteness, setProfileCompleteness] = useState(0);
  const [matches, setMatches] = useState<DashboardMatch[]>([]);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
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
      pipelineStages?: PipelineStage[];
      recommendedContent: RecommendedItem[];
      creditActivity: CreditWeek[];
      earnSpendDeltaPct: number;
    };
    setCredits(data.credits);
    setProfileCompleteness(data.profileCompleteness);
    setMatches(data.matches);
    setPipelineStages(data.pipelineStages ?? []);
    setRecommendedContent(data.recommendedContent);
    setCreditActivity(data.creditActivity ?? []);
    setEarnSpendDeltaPct(data.earnSpendDeltaPct ?? 0);
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const journeyStages = useMemo(() => {
    if (pipelineStages.length) {
      return [...pipelineStages].sort((a, b) => a.order - b.order);
    }
    return [
      { id: "applied", name: labels.journey_applied ?? "Applied", order: 0, color: "#4b3f9c" },
      {
        id: "shortlisted",
        name: labels.journey_shortlisted ?? "Shortlisted",
        order: 1,
        color: "#c97a2e",
      },
      {
        id: "interviewing",
        name: labels.journey_interviewing ?? "Interviewing",
        order: 2,
        color: "#2d6a4f",
      },
      { id: "placed", name: labels.journey_placed ?? "Placed", order: 3, color: "#27500a" },
    ];
  }, [pipelineStages, labels]);

  const currentMatch = useMemo(() => {
    if (!matches.length) return null;
    return [...matches].sort((a, b) => (b.order ?? 0) - (a.order ?? 0))[0] ?? null;
  }, [matches]);

  const currentStageName =
    currentMatch?.stageName || labels.stageEmpty || journeyStages[0]?.name || "Applied";

  const journeyIndex = useMemo(() => {
    if (!currentMatch) return 0;
    const byId = journeyStages.findIndex((s) => s.id === currentMatch.stageId);
    if (byId >= 0) return byId;
    const byName = journeyStages.findIndex(
      (s) => s.name.toLowerCase() === currentMatch.stageName.toLowerCase(),
    );
    if (byName >= 0) return byName;
    if (currentMatch.shortlisted) {
      const shortIdx = journeyStages.findIndex((s) =>
        /shortlist/i.test(s.name),
      );
      if (shortIdx >= 0) return shortIdx;
    }
    return Math.max(
      0,
      journeyStages.findIndex((s) => s.order === (currentMatch.order ?? 0)),
    );
  }, [currentMatch, journeyStages]);

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
          <ProfileCompletenessRing
            value={profileCompleteness}
            label={labels.profileCompletenessLabel ?? "Profile complete"}
          />
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

      <PortalVideosSection apiPath="/api/student/videos" labels={labels} />

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
          {journeyStages.map((step, index) => {
            const done = index < journeyIndex;
            const current = index === journeyIndex;
            const isIssue = /fail|reject|block|issue|hold/i.test(step.name);
            const color = isIssue ? "var(--text-warning)" : step.color;
            return (
              <li key={step.id} className="relative flex flex-1 flex-col items-center">
                {index < journeyStages.length - 1 ? (
                  <span
                    className="absolute left-1/2 top-4 h-0.5 w-full"
                    style={{
                      backgroundColor:
                        index < journeyIndex
                          ? journeyStages[index]?.color ?? color
                          : "var(--border)",
                      opacity: index < journeyIndex ? 0.85 : 1,
                    }}
                    aria-hidden
                  />
                ) : null}
                <span
                  className={cn(
                    "relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold text-on-accent",
                    !done && !current && "text-text-muted",
                  )}
                  style={{
                    backgroundColor: done
                      ? color
                      : current
                        ? color
                        : hexToRgba(step.color, 0.18),
                    color: done || current ? "#fff" : undefined,
                    boxShadow: current
                      ? `0 0 0 3px ${hexToRgba(step.color, 0.35)}`
                      : undefined,
                  }}
                >
                  {done ? "✓" : index + 1}
                </span>
                <p
                  className="mt-2 text-center text-[12px] font-medium"
                  style={{
                    color: current || done ? color : "var(--text-secondary)",
                  }}
                >
                  {step.name}
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
