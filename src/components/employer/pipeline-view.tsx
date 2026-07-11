"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState, KanbanBoard } from "@/components/ui";
import { cn } from "@/lib/utils";

interface PipelineStage {
  id: string;
  name: string;
  order: number;
  color: string;
}

interface EmployerMatch {
  id: string;
  stageId: string;
  shortlisted?: boolean;
  student: {
    fullName: string;
    email: string;
    sector: string;
    seniority: string;
    currentCity: string;
  } | null;
}

export interface PipelineViewProps {
  labels: Record<string, string>;
}

export function PipelineView({ labels }: PipelineViewProps) {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [matches, setMatches] = useState<EmployerMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [moveError, setMoveError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [stagesResponse, matchesResponse] = await Promise.all([
      fetch("/api/employer/pipeline-stages"),
      fetch("/api/employer/matches"),
    ]);
    const stagesData = (await stagesResponse.json()) as { stages: PipelineStage[] };
    const matchesData = (await matchesResponse.json()) as { matches: EmployerMatch[] };
    setStages(stagesData.stages ?? []);
    setMatches(matchesData.matches ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const findStage = useCallback(
    (hint: RegExp) => stages.find((s) => hint.test(s.name) || hint.test(s.id)),
    [stages],
  );

  const countFor = useCallback(
    (hint: RegExp) => {
      const stage = findStage(hint);
      if (!stage) return 0;
      return matches.filter((m) => m.stageId === stage.id).length;
    },
    [findStage, matches],
  );

  const stats = useMemo(
    () => [
      {
        key: "viewed",
        label: labels.statViewed ?? "Viewed",
        value: matches.length || countFor(/view|new|intro/i),
        tone: "text-fill-accent",
      },
      {
        key: "shortlisted",
        label: labels.statShortlisted ?? "Shortlisted",
        value:
          matches.filter((m) => m.shortlisted).length ||
          countFor(/shortlist/i),
        tone: "text-text-accent",
      },
      {
        key: "interviews",
        label: labels.statInterviews ?? "Interviews planned",
        value: countFor(/interview/i),
        tone: "text-text-success",
      },
      {
        key: "placed",
        label: labels.statPlaced ?? "Placed",
        value: countFor(/placed|offer/i),
        tone: "text-text-primary",
      },
    ],
    [countFor, labels, matches],
  );

  const funnel = useMemo(() => {
    const rows = [
      { key: "viewed", label: labels.funnelViewed ?? "Viewed", hint: /view|new|intro/i, tone: "bg-fill-accent" },
      { key: "shortlisted", label: labels.funnelShortlisted ?? "Shortlisted", hint: /shortlist/i, tone: "bg-fill-accent-strong" },
      { key: "interviewing", label: labels.funnelInterviewing ?? "Interviewing", hint: /interview/i, tone: "bg-bg-purple" },
      { key: "placed", label: labels.funnelPlaced ?? "Placed", hint: /placed|offer/i, tone: "bg-text-accent" },
    ];
    return rows.map((row) => ({
      ...row,
      value:
        row.key === "viewed"
          ? Math.max(matches.length, countFor(row.hint))
          : row.key === "shortlisted"
            ? Math.max(
                matches.filter((m) => m.shortlisted).length,
                countFor(row.hint),
              )
            : countFor(row.hint),
    }));
  }, [countFor, labels, matches]);

  const maxFunnel = Math.max(1, ...funnel.map((f) => f.value));

  const columns = useMemo(
    () =>
      stages.map((stage) => ({
        id: stage.id,
        title: stage.name,
        color: stage.color,
      })),
    [stages],
  );

  const items = useMemo(
    () =>
      matches.map((match) => ({
        id: match.id,
        columnId: match.stageId,
        content: (
          <div>
            <p className="font-medium text-text-primary">
              {match.student?.fullName ?? match.id}
            </p>
            {match.student?.currentCity ? (
              <p className="mt-1 text-xs text-text-muted">
                {match.student.currentCity}
              </p>
            ) : null}
          </div>
        ),
      })),
    [matches],
  );

  const handleMove = async (itemId: string, toColumnId: string) => {
    setMoveError(null);
    const response = await fetch(`/api/employer/matches/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageId: toColumnId }),
    });
    if (!response.ok) {
      setMoveError(labels.moveError ?? "Could not move candidate.");
      return;
    }
    await loadData();
  };

  if (isLoading) return null;

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-6">
      <header className="space-y-1">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-label">
          {labels.eyebrow ?? "Pipeline"}
        </p>
        <h1 className="font-serif text-[clamp(1.5rem,3vw,2.125rem)] font-semibold leading-tight text-text-primary">
          {labels.title ?? "Your hiring in motion."}
        </h1>
      </header>

      {moveError ? (
        <p className="text-sm text-text-warning" role="status">
          {moveError}
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((card) => (
          <div
            key={card.key}
            className="rounded-radius border border-border bg-grad-card px-4 py-3.5"
          >
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
              {card.label}
            </p>
            <p
              className={cn(
                "mt-1 font-serif text-[1.65rem] font-semibold leading-none",
                card.tone,
              )}
            >
              {card.value}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-radius border border-border bg-grad-card p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[14px] font-semibold text-text-primary">
            {labels.funnelTitle ?? "Hiring funnel, this quarter"}
          </h2>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-text-secondary">
            <span className="h-2.5 w-2.5 rounded-sm bg-fill-accent" />
            {labels.funnelLegend ?? "Candidates at each stage"}
          </span>
        </div>
        <ul className="space-y-3">
          {funnel.map((row) => (
            <li key={row.key} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-[12.5px] text-text-secondary">
                {row.label}
              </span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface-2">
                <div
                  className={cn("h-full rounded-full", row.tone)}
                  style={{ width: `${(row.value / maxFunnel) * 100}%` }}
                />
              </div>
              <span className="w-8 text-right font-mono text-[12px] text-text-primary">
                {row.value}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-radius border border-border bg-grad-card p-4">
        <h2 className="mb-3 text-[14px] font-semibold text-text-primary">
          {labels.activeTitle ?? "Active candidates"}
        </h2>
        {matches.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-muted">
            {labels.emptyState ?? "No candidates in pipeline yet. Browse the "}
            <Link
              href="/employer/talent-pool"
              className="font-medium text-fill-accent underline-offset-2 hover:underline"
            >
              {labels.talentPoolLink ?? "Talent Pool"}
            </Link>{" "}
            {labels.emptyStateSuffix ?? "to get started."}
          </p>
        ) : stages.length ? (
          <KanbanBoard columns={columns} items={items} onItemMove={handleMove} />
        ) : (
          <EmptyState title={labels.emptyState ?? "No stages configured"} />
        )}
      </section>
    </div>
  );
}
