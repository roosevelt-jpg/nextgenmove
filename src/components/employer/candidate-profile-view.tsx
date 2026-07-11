"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button, EmptyState } from "@/components/ui";

interface CandidateDetail {
  match: {
    id: string;
    stageId: string;
    shortlisted: boolean;
    matchScore: number | null;
  };
  student: {
    id: string;
    fullName: string;
    email: string;
    sector: string;
    seniority: string;
    currentCity: string;
    targetCities: string[];
    skills: string[];
    bio: string;
    availability: string;
    linkedinUrl: string | null;
    portfolioUrl: string | null;
    cvUrl: string | null;
  };
}

export interface CandidateProfileViewProps {
  labels: Record<string, string>;
}

export function CandidateProfileView({ labels }: CandidateProfileViewProps) {
  const params = useParams<{ id: string }>();
  const matchId = params.id;
  const [data, setData] = useState<CandidateDetail | null>(null);
  const [error, setError] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    const response = await fetch(`/api/employer/matches/${matchId}`);
    if (!response.ok) {
      setError(true);
      setData(null);
      setIsLoading(false);
      return;
    }
    setData((await response.json()) as CandidateDetail);
    setError(false);
    setIsLoading(false);
  }, [matchId]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleShortlist = async () => {
    if (!data) return;
    setActionMessage(null);
    const response = await fetch(`/api/employer/matches/${matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shortlisted: !data.match.shortlisted }),
    });
    if (!response.ok) {
      setActionMessage(labels.shortlistError ?? "Could not update shortlist.");
      return;
    }
    await load();
  };

  if (isLoading) return null;

  if (error || !data) {
    return (
      <EmptyState title={labels.notFound ?? labels.emptyState ?? "Not found"} />
    );
  }

  const { student, match } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/employer/talent-pool"
          className="text-sm text-text-secondary hover:text-text-primary"
        >
          {labels.backToPool ?? "← Talent pool"}
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-text-primary">
            {student.fullName}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {[student.seniority, student.sector, student.currentCity]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {typeof match.matchScore === "number" ? (
            <span className="rounded-full bg-bg-purple px-3 py-1 font-mono text-xs font-medium text-text-label">
              {match.matchScore}%
              {labels.matchScoreLabel ? ` ${labels.matchScoreLabel}` : ""}
            </span>
          ) : null}
          <Button size="sm" onClick={() => void toggleShortlist()}>
            {match.shortlisted
              ? (labels.unshortlistAction ?? labels.shortlistedLabel)
              : labels.shortlistAction}
          </Button>
        </div>
      </header>

      {actionMessage ? (
        <p className="text-sm text-text-warning" role="status">
          {actionMessage}
        </p>
      ) : null}

      {student.bio ? (
        <section className="rounded-radius border border-border bg-grad-card p-4">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">
            {labels.bioLabel ?? "Bio"}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            {student.bio}
          </p>
        </section>
      ) : null}

      {student.skills.length ? (
        <section>
          <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">
            {labels.skillsLabel ?? "Skills"}
          </h2>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {student.skills.map((skill) => (
              <li
                key={skill}
                className="rounded-radius bg-bg-tag px-2 py-0.5 text-xs font-medium text-text-tag"
              >
                {skill}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <dl className="grid gap-3 rounded-radius border border-border bg-grad-card p-4 sm:grid-cols-2">
        {student.availability ? (
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">
              {labels.availabilityLabel ?? "Availability"}
            </dt>
            <dd className="mt-1 text-sm text-text-primary">{student.availability}</dd>
          </div>
        ) : null}
        {student.targetCities?.length ? (
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">
              {labels.targetCitiesLabel ?? "Target cities"}
            </dt>
            <dd className="mt-1 text-sm text-text-primary">
              {student.targetCities.join(", ")}
            </dd>
          </div>
        ) : null}
        {student.email ? (
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">
              {labels.emailLabel ?? "Email"}
            </dt>
            <dd className="mt-1 text-sm text-text-primary">{student.email}</dd>
          </div>
        ) : null}
      </dl>

      <div className="flex flex-wrap gap-3">
        {student.linkedinUrl ? (
          <a
            href={student.linkedinUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-text-label hover:text-fill-accent"
          >
            {labels.linkedinLabel ?? "LinkedIn"}
          </a>
        ) : null}
        {student.portfolioUrl ? (
          <a
            href={student.portfolioUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-text-label hover:text-fill-accent"
          >
            {labels.portfolioLabel ?? "Portfolio"}
          </a>
        ) : null}
        {student.cvUrl ? (
          <a
            href={student.cvUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-text-label hover:text-fill-accent"
          >
            {labels.cvLabel ?? "CV"}
          </a>
        ) : null}
      </div>
    </div>
  );
}
