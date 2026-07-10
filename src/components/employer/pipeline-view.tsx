"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState, KanbanBoard } from "@/components/ui";

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
    return labels.emptyState ? <EmptyState title={labels.emptyState} /> : null;
  }

  return (
    <KanbanBoard columns={columns} items={items} onItemMove={handleMove} />
  );
}
