"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, DataTable, EmptyState } from "@/components/ui";
import { useTaxonomies } from "@/lib/hooks/use-taxonomies";

interface TalentPoolRow extends Record<string, unknown> {
  matchId: string;
  shortlisted: boolean;
  studentId: string;
  fullName: string;
  email: string;
  sector: string;
  seniority: string;
  currentCity: string;
  skills: string[];
  availability: string;
}

export interface TalentPoolViewProps {
  labels: Record<string, string>;
}

export function TalentPoolView({ labels }: TalentPoolViewProps) {
  const { taxonomies } = useTaxonomies();
  const [rows, setRows] = useState<TalentPoolRow[]>([]);
  const [sector, setSector] = useState("");
  const [seniority, setSeniority] = useState("");
  const [location, setLocation] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadRows = useCallback(async () => {
    setIsLoading(true);
    const params = new URLSearchParams();

    if (sector) {
      params.set("sector", sector);
    }

    if (seniority) {
      params.set("seniority", seniority);
    }

    if (location) {
      params.set("location", location);
    }

    const response = await fetch(`/api/employer/talent-pool?${params.toString()}`);
    const data = (await response.json()) as { rows: TalentPoolRow[] };
    setRows(data.rows ?? []);
    setIsLoading(false);
  }, [location, sector, seniority]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const locationOptions = useMemo(
    () => [...new Set(rows.map((row) => row.currentCity).filter(Boolean))],
    [rows],
  );

  const shortlist = useCallback(
    async (matchId: string) => {
      await fetch(`/api/employer/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shortlisted: true }),
      });
      await loadRows();
    },
    [loadRows],
  );

  const columns = useMemo(
    () =>
      [
        labels.columnName
          ? {
              key: "fullName" as const,
              header: labels.columnName,
              sortable: true,
            }
          : null,
        labels.columnSector
          ? {
              key: "sector" as const,
              header: labels.columnSector,
              sortable: true,
              render: (row: TalentPoolRow) =>
                taxonomies.sector?.find((option) => option.value === row.sector)?.label ??
                row.sector,
            }
          : null,
        labels.columnSeniority
          ? {
              key: "seniority" as const,
              header: labels.columnSeniority,
              sortable: true,
              render: (row: TalentPoolRow) =>
                taxonomies.seniority?.find((option) => option.value === row.seniority)
                  ?.label ?? row.seniority,
            }
          : null,
        labels.columnLocation
          ? {
              key: "currentCity" as const,
              header: labels.columnLocation,
              sortable: true,
            }
          : null,
        labels.columnAvailability
          ? {
              key: "availability" as const,
              header: labels.columnAvailability,
              sortable: true,
            }
          : null,
        labels.shortlistAction
          ? {
              key: "matchId" as const,
              header: labels.columnActions,
              render: (row: TalentPoolRow) =>
                row.shortlisted ? (
                  labels.shortlistedLabel ? (
                    <span className="text-xs text-text-muted">{labels.shortlistedLabel}</span>
                  ) : null
                ) : (
                  <Button variant="outline" onClick={() => shortlist(row.matchId)}>
                    {labels.shortlistAction}
                  </Button>
                ),
            }
          : null,
      ].filter(Boolean),
    [labels, shortlist, taxonomies.sector, taxonomies.seniority],
  );

  if (isLoading) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {labels.filterSector ? (
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            {labels.filterSector}
            <select
              className="rounded-radius border border-border bg-surface-1 px-3 py-2"
              value={sector}
              onChange={(event) => setSector(event.target.value)}
            >
              <option value="">{labels.all}</option>
              {(taxonomies.sector ?? []).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {labels.filterSeniority ? (
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            {labels.filterSeniority}
            <select
              className="rounded-radius border border-border bg-surface-1 px-3 py-2"
              value={seniority}
              onChange={(event) => setSeniority(event.target.value)}
            >
              <option value="">{labels.all}</option>
              {(taxonomies.seniority ?? []).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {labels.filterLocation ? (
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            {labels.filterLocation}
            <select
              className="rounded-radius border border-border bg-surface-1 px-3 py-2"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            >
              <option value="">{labels.all}</option>
              {locationOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {rows.length ? (
        <DataTable
          columns={columns as never}
          data={rows}
          rowKey={(row) => row.matchId}
          emptyState={
            labels.emptyState ? <EmptyState title={labels.emptyState} /> : null
          }
        />
      ) : labels.emptyState ? (
        <EmptyState title={labels.emptyState} />
      ) : null}
    </div>
  );
}
