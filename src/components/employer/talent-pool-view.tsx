"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, EmptyState, Input } from "@/components/ui";
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
  canBrowse?: boolean;
}

const INTERVIEW_STAGE_HINT = "interview";

interface BrowseRow {
  studentId: string;
  fullName: string;
  sector: string;
  seniority: string;
  currentCity: string;
  skills: string[];
  matchScore: number;
}

export function TalentPoolView({ labels, canBrowse = false }: TalentPoolViewProps) {
  const { taxonomies } = useTaxonomies();
  const [rows, setRows] = useState<TalentPoolRow[]>([]);
  const [browseRows, setBrowseRows] = useState<BrowseRow[]>([]);
  const [sector, setSector] = useState("");
  const [seniority, setSeniority] = useState("");
  const [location, setLocation] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

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

    if (canBrowse) {
      const browseRes = await fetch(
        `/api/employer/talent-pool/browse?${params.toString()}`,
      );
      if (browseRes.ok) {
        const browseData = (await browseRes.json()) as { rows: BrowseRow[] };
        setBrowseRows(browseData.rows ?? []);
      }
    } else {
      setBrowseRows([]);
    }

    setIsLoading(false);
  }, [canBrowse, location, search, sector, seniority]);

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
      setActionMessage(null);
      const response = await fetch(`/api/employer/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shortlisted }),
      });
      if (!response.ok) {
        setActionMessage(labels.shortlistError ?? "Could not update shortlist.");
        return;
      }
      await loadRows();
    },
    [labels.shortlistError, loadRows],
  );

  const openBrowsed = useCallback(
    async (studentId: string) => {
      setActionMessage(null);
      const response = await fetch("/api/employer/talent-pool/browse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });
      if (!response.ok) {
        setActionMessage(labels.browseError ?? "Could not open candidate.");
        return;
      }
      const data = (await response.json()) as { matchId?: string };
      if (data.matchId) {
        window.location.href = `/employer/talent-pool/${data.matchId}`;
        return;
      }
      await loadRows();
    },
    [labels.browseError, loadRows],
  );

  if (isLoading) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-6">
      <header className="space-y-1">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-label">
          {labels.eyebrow ?? "Talent Pool"}
        </p>
        <h1 className="font-serif text-[clamp(1.5rem,3vw,2.125rem)] font-semibold leading-tight text-text-primary">
          {labels.title ?? "Find your next great hire."}
        </h1>
        {labels.subtitle ? (
          <p className="max-w-xl text-sm text-text-secondary">{labels.subtitle}</p>
        ) : null}
      </header>

      {actionMessage ? (
        <p className="text-sm text-text-warning" role="status">
          {actionMessage}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        {labels.statCandidates ? (
          <div className="rounded-radius border border-border bg-grad-card px-4 py-3.5">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
              {labels.statCandidates}
            </p>
            <p className="mt-1 font-serif text-[1.65rem] font-semibold text-text-primary">
              {rows.length}
            </p>
          </div>
        ) : null}
        {labels.statShortlisted ? (
          <div className="rounded-radius border border-border bg-grad-card px-4 py-3.5">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
              {labels.statShortlisted}
            </p>
            <p className="mt-1 font-serif text-[1.65rem] font-semibold text-fill-accent">
              {shortlistedCount}
            </p>
          </div>
        ) : null}
        {labels.statInterviewing ? (
          <div className="rounded-radius border border-border bg-grad-card px-4 py-3.5">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
              {labels.statInterviewing}
            </p>
            <p className="mt-1 font-serif text-[1.65rem] font-semibold text-text-success">
              {interviewingCount}
            </p>
          </div>
        ) : null}
      </div>

      <div className="rounded-radius border border-border bg-grad-card p-3">
        {labels.searchPlaceholder ? (
          <Input
            label={labels.searchLabel ?? labels.searchPlaceholder}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={labels.searchPlaceholder}
          />
        ) : null}
        <div className="mt-3 grid gap-3 md:grid-cols-3">
        {labels.filterSector ? (
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            {labels.filterSector}
            <select
              className="min-h-11 rounded-radius-sm border border-border bg-bg px-2.5 py-2.5 text-sm"
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
              className="min-h-11 rounded-radius-sm border border-border bg-bg px-2.5 py-2.5 text-sm"
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
              className="min-h-11 rounded-radius-sm border border-border bg-bg px-2.5 py-2.5 text-sm"
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
      </div>

      {rows.length ? (
        <ul className="space-y-2">
          {rows.map((row) => {
            const sectorLabel =
              taxonomies.sector?.find((option) => option.value === row.sector)
                ?.label ?? row.sector;

            return (
              <li
                key={row.matchId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-radius border border-border bg-grad-card px-3.5 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bg-purple text-[11px] font-bold text-fill-accent">
                    {initialsFromName(row.fullName)}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-text-primary">{row.fullName}</p>
                    <p className="text-[12.5px] text-text-secondary">
                      {[sectorLabel, row.currentCity].filter(Boolean).join(" · ")}
                    </p>
                    {row.skills?.length ? (
                      <ul className="mt-1.5 flex flex-wrap gap-1">
                        {row.skills.slice(0, 4).map((skill) => (
                          <li
                            key={skill}
                            className="rounded-full bg-bg-success px-2 py-0.5 text-[10.5px] font-medium text-text-success"
                          >
                            {skill}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {typeof row.matchScore === "number" ? (
                    <span className="rounded-full bg-bg-purple px-2.5 py-0.5 text-[11px] font-semibold text-fill-accent">
                      {row.matchScore}% {labels.matchScoreLabel ?? "match"}
                    </span>
                  ) : null}
                  {labels.viewProfile ? (
                    <Link
                      href={`/employer/talent-pool/${row.matchId}`}
                      className="inline-flex min-h-11 items-center justify-center rounded-radius-sm bg-grad-rouse px-3 text-[12px] font-semibold text-on-gradient hover:opacity-90"
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
      ) : (
        <EmptyState
          title={labels.emptyState ?? "No candidates yet"}
          action={
            canBrowse ? undefined : (
              <Link
                href="/employer/profile"
                className="text-sm font-medium text-text-accent hover:underline"
              >
                {labels.emptyCta ?? "Complete your company profile"}
              </Link>
            )
          }
        />
      )}

      {canBrowse ? (
        <section className="space-y-3 border-t border-border pt-6">
          {labels.browseTitle ? (
            <h2 className="font-serif text-xl text-text-primary">
              {labels.browseTitle}
            </h2>
          ) : null}
          {labels.browseIntro ? (
            <p className="text-sm text-text-secondary">{labels.browseIntro}</p>
          ) : null}
          {browseRows.length ? (
            <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {browseRows.map((row) => (
                <li
                  key={row.studentId}
                  className="rounded-radius border border-dashed border-border bg-grad-card p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-serif text-lg text-text-primary">
                        {row.fullName}
                      </p>
                      <p className="text-sm text-text-secondary">
                        {[row.seniority, row.sector, row.currentCity]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <span className="rounded-full bg-bg-purple px-2 py-0.5 font-mono text-[10px] text-text-label">
                      {row.matchScore}%
                    </span>
                  </div>
                  {row.skills.length ? (
                    <ul className="mt-2 flex flex-wrap gap-1">
                      {row.skills.map((skill) => (
                        <li
                          key={skill}
                          className="rounded-radius bg-bg-tag px-2 py-0.5 text-xs text-text-tag"
                        >
                          {skill}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <Button
                    size="sm"
                    className="mt-3"
                    onClick={() => void openBrowsed(row.studentId)}
                  >
                    {labels.browseOpenAction ?? "Open profile"}
                  </Button>
                </li>
              ))}
            </ul>
          ) : labels.browseEmpty ? (
            <p className="text-sm text-text-muted">{labels.browseEmpty}</p>
          ) : null}
        </section>
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
