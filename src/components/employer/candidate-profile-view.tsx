"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button, EmptyState, Input, Modal } from "@/components/ui";
import { avatarToneClasses, initialsFromName } from "@/lib/avatar-hue";

interface CandidateDetail {
  match: {
    id: string;
    stageId: string;
    shortlisted: boolean;
    matchScore: number | null;
    identityUnlocked?: boolean;
    unlockRequestStatus?: "none" | "pending" | "approved" | "declined";
  };
  student: {
    id: string;
    displayName?: string;
    fullName: string;
    identityUnlocked?: boolean;
    unlockRequestStatus?: "none" | "pending" | "approved" | "declined";
    email: string;
    phone?: string | null;
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
    photoUrl?: string | null;
    workExperience?: string | null;
    workExperienceEntries?: Array<{
      company: string;
      title: string;
      from: string;
      to?: string | null;
      description?: string;
    }>;
    education?: Array<{
      institution: string;
      degree?: string;
      year?: string;
    }>;
    assessment?: unknown;
    githubUrl?: string | null;
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
  const [interviewOpen, setInterviewOpen] = useState(false);
  const [interviewAt, setInterviewAt] = useState("");
  const [busy, setBusy] = useState(false);

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

  const patchMatch = async (body: Record<string, unknown>) => {
    setBusy(true);
    setActionMessage(null);
    const response = await fetch(`/api/employer/matches/${matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!response.ok) {
      setActionMessage(labels.actionError || "Could not update applicant.");
      return false;
    }
    await load();
    return true;
  };

  const requestUnlock = async () => {
    setBusy(true);
    setActionMessage(null);
    const response = await fetch("/api/employer/unlock-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId }),
    });
    setBusy(false);
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (payload?.error === "already_unlocked") {
        setActionMessage(labels.unlockAlreadyApproved || "Already unlocked.");
      } else {
        setActionMessage(labels.unlockRequestError || "Could not submit unlock request.");
      }
      return;
    }
    setActionMessage(labels.unlockRequestSubmitted || "Unlock request submitted.");
    await load();
  };

  const toggleShortlist = async () => {
    if (!data) return;
    await patchMatch({ shortlisted: !data.match.shortlisted });
  };

  if (isLoading) return null;

  if (error || !data) {
    return (
      <EmptyState title={labels.notFound ?? labels.emptyState ?? "Not found"} />
    );
  }

  const { student, match } = data;
  const unlocked =
    student.identityUnlocked === true || match.identityUnlocked === true;
  const unlockStatus =
    student.unlockRequestStatus ?? match.unlockRequestStatus ?? "none";
  const displayName =
    student.displayName || student.fullName || labels.anonymizedCandidate || "Candidate";

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
        <div className="flex gap-3">
          {unlocked && student.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={student.photoUrl}
              alt=""
              className="h-16 w-16 rounded-radius object-cover"
            />
          ) : (
            <div
              className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-radius text-sm font-bold ${avatarToneClasses(displayName)}`}
              aria-hidden
            >
              {initialsFromName(displayName)}
            </div>
          )}
          <div>
            <h1 className="font-serif text-3xl text-text-primary">
              {displayName}
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              {[student.seniority, student.sector, student.currentCity]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {!unlocked ? (
              <p className="mt-2 text-xs text-text-muted">
                {labels.anonymizedNotice ||
                  "Identity is hidden until Nextgenmove approves an unlock request."}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {typeof match.matchScore === "number" ? (
            <span className="rounded-full bg-bg-purple px-3 py-1 font-mono text-xs font-medium text-text-label">
              {match.matchScore}%
              {labels.matchScoreLabel ? ` ${labels.matchScoreLabel}` : ""}
            </span>
          ) : null}
          {!unlocked ? (
            unlockStatus === "pending" ? (
              <span className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-text-secondary">
                {labels.unlockPending || "Unlock pending"}
              </span>
            ) : (
              <Button size="sm" disabled={busy} onClick={() => void requestUnlock()}>
                {labels.requestUnlock || "Request unlock"}
              </Button>
            )
          ) : (
            <span className="rounded-full bg-bg-purple px-3 py-1.5 text-xs font-medium text-text-label">
              {labels.unlockApproved || "Identity unlocked"}
            </span>
          )}
          <Button size="sm" disabled={busy} onClick={() => void toggleShortlist()}>
            {match.shortlisted
              ? (labels.unshortlistAction ?? labels.shortlistedLabel)
              : labels.shortlistAction}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy || !unlocked}
            onClick={() => setInterviewOpen(true)}
          >
            {labels.scheduleInterview || "Schedule Interview"}
          </Button>
          <Button
            size="sm"
            disabled={busy || !unlocked}
            onClick={() => void patchMatch({ action: "hire" })}
          >
            {labels.hireAction || "Hire"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void patchMatch({ action: "reject" })}
          >
            {labels.rejectAction || "Reject"}
          </Button>
        </div>
      </header>

      {actionMessage ? (
        <p className="text-sm text-text-warning" role="status">
          {actionMessage}
        </p>
      ) : null}

      {unlockStatus === "declined" && !unlocked ? (
        <p className="text-sm text-text-secondary" role="status">
          {labels.unlockDeclined ||
            "Unlock was declined. You may submit a new request."}
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

      {student.education && student.education.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">
            {labels.educationLabel || "Education"}
          </h2>
          {student.education.map((entry, index) => (
            <div
              key={`${entry.degree}-${entry.year}-${index}`}
              className="rounded-radius border border-border bg-grad-card p-4"
            >
              <p className="font-medium text-text-primary">
                {[entry.degree, unlocked ? entry.institution : null]
                  .filter(Boolean)
                  .join(" · ") || labels.educationEntryFallback || "Education"}
              </p>
              {entry.year ? (
                <p className="mt-0.5 text-xs text-text-muted">{entry.year}</p>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}

      {student.workExperienceEntries && student.workExperienceEntries.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">
            {labels.workExperienceLabel || "Work experience"}
          </h2>
          {student.workExperienceEntries.map((entry, index) => (
            <div
              key={`${entry.title}-${index}`}
              className="rounded-radius border border-border bg-grad-card p-4"
            >
              <p className="font-medium text-text-primary">
                {entry.title}
                {unlocked && entry.company ? ` · ${entry.company}` : ""}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">
                {[entry.from, entry.to].filter(Boolean).join(" – ")}
              </p>
              {entry.description ? (
                <p className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">
                  {entry.description}
                </p>
              ) : null}
            </div>
          ))}
        </section>
      ) : student.workExperience ? (
        <section className="rounded-radius border border-border bg-grad-card p-4">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">
            {labels.workExperienceLabel || "Work experience"}
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">
            {student.workExperience}
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
        {unlocked && student.email ? (
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">
              {labels.emailLabel ?? "Email"}
            </dt>
            <dd className="mt-1 text-sm text-text-primary">{student.email}</dd>
          </div>
        ) : null}
        {unlocked && student.phone ? (
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">
              {labels.phoneLabel || "Phone"}
            </dt>
            <dd className="mt-1 text-sm text-text-primary">{student.phone}</dd>
          </div>
        ) : null}
      </dl>

      {unlocked ? (
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
          {student.githubUrl ? (
            <a
              href={student.githubUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-text-label hover:text-fill-accent"
            >
              {labels.githubLabel || "GitHub"}
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
              {labels.cvLabel ?? "Resume"}
            </a>
          ) : null}
        </div>
      ) : null}

      <Modal
        open={interviewOpen}
        onClose={() => setInterviewOpen(false)}
        title={labels.scheduleInterviewTitle || "Schedule Interview"}
        footer={
          <div className="flex gap-2">
            <Button
              disabled={busy || !interviewAt}
              onClick={() => {
                void (async () => {
                  const ok = await patchMatch({
                    action: "schedule_interview",
                    interviewAt: new Date(interviewAt).toISOString(),
                  });
                  if (ok) setInterviewOpen(false);
                })();
              }}
            >
              {labels.confirmInterview || "Confirm"}
            </Button>
            <Button variant="outline" onClick={() => setInterviewOpen(false)}>
              {labels.cancel || "Cancel"}
            </Button>
          </div>
        }
      >
        <Input
          type="datetime-local"
          label={labels.interviewAtLabel || "Date and time"}
          value={interviewAt}
          onChange={(e) => setInterviewAt(e.target.value)}
        />
      </Modal>
    </div>
  );
}
