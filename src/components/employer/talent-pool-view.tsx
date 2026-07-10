"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, EmptyState, StatCard } from "@/components/ui";
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

const VALUE_TONES = [
  "text-fill-accent",
  "text-text-accent",
  "text-text-success",
] as const;

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

  const shortlistedCount = useMemo(
    () => rows.filter((row) => row.shortlisted).length,
    [rows],
  );

  const sectorCount = useMemo(
    () => new Set(rows.map((row) => row.sector).filter(Boolean)).size,
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

  if (isLoading) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {labels.statCandidates ? (
          <StatCard
            label={labels.statCandidates}
            value={rows.length}
            valueClassName={VALUE_TONES[0]}
          />
        ) : null}
        {labels.statShortlisted ? (
          <StatCard
            label={labels.statShortlisted}
            value={shortlistedCount}
            valueClassName={VALUE_TONES[1]}
          />
        ) : null}
        {labels.statSectors ? (
          <StatCard
            label={labels.statSectors}
            value={sectorCount}
            valueClassName={VALUE_TONES[2]}
          />
        ) : null}
      </div>

      <div className="grid gap-4 rounded-radius border border-border bg-surface-1 p-4 md:grid-cols-3">
        {labels.filterSector ? (
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            {labels.filterSector}
            <select
              className="rounded-radius border border-border bg-bg px-3 py-2"
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
              className="rounded-radius border border-border bg-bg px-3 py-2"
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
              className="rounded-radius border border-border bg-bg px-3 py-2"
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
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => {
            const sectorLabel =
              taxonomies.sector?.find((option) => option.value === row.sector)
                ?.label ?? row.sector;
            const seniorityLabel =
              taxonomies.seniority?.find(
                (option) => option.value === row.seniority,
              )?.label ?? row.seniority;

            return (
              <li
                key={row.matchId}
                className="flex flex-col rounded-radius border border-border bg-surface-1 p-5"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-radius bg-brand-lavender font-serif text-base font-semibold text-fill-accent"
                    aria-hidden="true"
                  >
                    {initialsFromName(row.fullName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-lg text-text-primary">
                      {row.fullName}
                    </p>
                    <p className="mt-0.5 text-sm text-text-secondary">
                      {[seniorityLabel, sectorLabel, row.currentCity]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </div>

                {row.skills?.length ? (
                  <ul className="mt-4 flex flex-wrap gap-1.5">
                    {row.skills.slice(0, 6).map((skill) => (
                      <li
                        key={skill}
                        className="rounded-radius bg-bg-tag px-2 py-0.5 text-xs font-medium text-text-tag"
                      >
                        {skill}
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
                  {row.shortlisted && labels.shortlistedLabel ? (
                    <span className="text-xs font-medium text-text-label">
                      {labels.shortlistedLabel}
                    </span>
                  ) : labels.shortlistAction || labels.viewProfile ? (
                    <Button size="sm" onClick={() => shortlist(row.matchId)}>
                      {labels.viewProfile ?? labels.shortlistAction}
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : labels.emptyState ? (
        <EmptyState title={labels.emptyState} />
      ) : null}
    </div>
  );
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return "";
  }
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}
