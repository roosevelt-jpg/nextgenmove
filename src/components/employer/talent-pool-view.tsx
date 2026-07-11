"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, EmptyState, Input, StatCard } from "@/components/ui";
import { useTaxonomies } from "@/lib/hooks/use-taxonomies";

interface TalentPoolRow extends Record<string, unknown> {
  matchId: string;
  shortlisted: boolean;
  stageId: string;
  matchScore: number | null;
  studentId: string;
  fullName: string;
  email: string;
  sector: string;
  seniority: string;
  currentCity: string;
  skills: string[];
  availability: string;
  bio: string;
}

export interface TalentPoolViewProps {
  labels: Record<string, string>;
}

const VALUE_TONES = [
  "text-fill-accent",
  "text-text-accent",
  "text-text-success",
] as const;

const INTERVIEW_STAGE_HINT = "interview";

export function TalentPoolView({ labels }: TalentPoolViewProps) {
  const { taxonomies } = useTaxonomies();
  const [rows, setRows] = useState<TalentPoolRow[]>([]);
  const [sector, setSector] = useState("");
  const [seniority, setSeniority] = useState("");
  const [location, setLocation] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadRows = useCallback(async () => {
    setIsLoading(true);
    const params = new URLSearchParams();

    if (sector) params.set("sector", sector);
    if (seniority) params.set("seniority", seniority);
    if (location) params.set("location", location);
    if (search.trim()) params.set("search", search.trim());

    const response = await fetch(`/api/employer/talent-pool?${params.toString()}`);
    const data = (await response.json()) as { rows: TalentPoolRow[] };
    setRows(data.rows ?? []);
    setIsLoading(false);
  }, [location, search, sector, seniority]);

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

  const interviewingCount = useMemo(
    () =>
      rows.filter((row) =>
        String(row.stageId).toLowerCase().includes(INTERVIEW_STAGE_HINT),
      ).length,
    [rows],
  );

  const shortlist = useCallback(
    async (matchId: string, shortlisted: boolean) => {
      await fetch(`/api/employer/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shortlisted }),
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
        {labels.statInterviewing ? (
          <StatCard
            label={labels.statInterviewing}
            value={interviewingCount}
            valueClassName={VALUE_TONES[2]}
          />
        ) : labels.statSectors ? (
          <StatCard
            label={labels.statSectors}
            value={
              new Set(rows.map((row) => row.sector).filter(Boolean)).size
            }
            valueClassName={VALUE_TONES[2]}
          />
        ) : null}
      </div>

      <div className="grid gap-3 rounded-radius border border-border bg-surface-1 p-4 md:grid-cols-4">
        {labels.searchPlaceholder ? (
          <div className="md:col-span-4">
            <Input
              label={labels.searchLabel ?? labels.searchPlaceholder}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={labels.searchPlaceholder}
            />
          </div>
        ) : null}
        {labels.filterSector ? (
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            {labels.filterSector}
            <select
              className="rounded-radius-sm border border-border bg-bg px-2.5 py-1.5 text-sm"
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
              className="rounded-radius-sm border border-border bg-bg px-2.5 py-1.5 text-sm"
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
              className="rounded-radius-sm border border-border bg-bg px-2.5 py-1.5 text-sm"
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
                className="flex flex-col rounded-radius border border-border bg-surface-1 p-4"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-radius bg-brand-lavender font-serif text-sm font-semibold text-fill-accent"
                    aria-hidden="true"
                  >
                    {initialsFromName(row.fullName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-serif text-lg text-text-primary">
                        {row.fullName}
                      </p>
                      {typeof row.matchScore === "number" ? (
                        <span className="shrink-0 rounded-full bg-bg-purple px-2 py-0.5 font-mono text-[10px] font-medium text-text-label">
                          {row.matchScore}%
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-sm text-text-secondary">
                      {[seniorityLabel, sectorLabel, row.currentCity]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </div>

                {row.skills?.length ? (
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {row.skills.slice(0, 3).map((skill) => (
                      <li
                        key={skill}
                        className="rounded-radius bg-bg-tag px-2 py-0.5 text-xs font-medium text-text-tag"
                      >
                        {skill}
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                  {labels.viewProfile ? (
                    <Link
                      href={`/employer/talent-pool/${row.matchId}`}
                      className="inline-flex items-center justify-center rounded-radius-sm border border-fill-primary px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-surface-2"
                    >
                      {labels.viewProfile}
                    </Link>
                  ) : null}
                  {row.shortlisted ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => shortlist(row.matchId, false)}
                    >
                      {labels.unshortlistAction ?? labels.shortlistedLabel}
                    </Button>
                  ) : labels.shortlistAction ? (
                    <Button size="sm" onClick={() => shortlist(row.matchId, true)}>
                      {labels.shortlistAction}
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
  if (!parts.length) return "";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}
