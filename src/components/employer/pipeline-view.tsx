"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState, KanbanBoard, StatCard } from "@/components/ui";

interface PipelineStage {
  id: string;
  name: string;
  order: number;
  color: string;
}

interface EmployerMatch {
  id: string;
  stageId: string;
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

const VALUE_TONES = [
  "text-fill-accent",
  "text-text-accent",
  "text-text-success",
  "text-text-primary",
] as const;

export function PipelineView({ labels }: PipelineViewProps) {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [matches, setMatches] = useState<EmployerMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
              <p className="mt-1 text-xs text-text-muted">{match.student.currentCity}</p>
            ) : null}
          </div>
        ),
      })),
    [matches],
  );

  const stageCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const stage of stages) {
      counts.set(stage.id, 0);
    }
    for (const match of matches) {
      counts.set(match.stageId, (counts.get(match.stageId) ?? 0) + 1);
    }
    return counts;
  }, [matches, stages]);

  const handleMove = async (itemId: string, toColumnId: string) => {
    await fetch(`/api/employer/matches/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageId: toColumnId }),
    });
    await loadData();
  };

  if (isLoading) {
    return null;
  }

  if (!stages.length) {
    return labels.emptyState ? (
      <div className="rounded-radius border border-dashed border-border bg-surface-1 p-2">
        <EmptyState title={labels.emptyState} />
      </div>
    ) : null;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {labels.statTotal ? (
          <StatCard
            label={labels.statTotal}
            value={matches.length}
            valueClassName={VALUE_TONES[0]}
          />
        ) : null}
        {stages.slice(0, 3).map((stage, index) => (
          <StatCard
            key={stage.id}
            label={stage.name}
            value={stageCounts.get(stage.id) ?? 0}
            valueClassName={VALUE_TONES[(index + 1) % VALUE_TONES.length]}
          />
        ))}
      </div>

      {matches.length === 0 && labels.emptyState ? (
        <div className="rounded-radius border border-dashed border-border bg-surface-1">
          <EmptyState title={labels.emptyState} />
        </div>
      ) : (
        <div className="rounded-radius border border-border bg-surface-1 p-4">
          <KanbanBoard columns={columns} items={items} onItemMove={handleMove} />
        </div>
      )}
    </div>
  );
}
