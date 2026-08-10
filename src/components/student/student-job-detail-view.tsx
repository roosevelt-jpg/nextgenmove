"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button, EmptyState } from "@/components/ui";

interface JobDetail {
  id: string;
  title: string;
  employerLabel: string;
  description: string;
  location: string;
  salary: string;
  employmentType: string;
  department?: string;
  categories: string[];
  skills: string[];
  companyName?: string;
  companyWebsite?: string;
  companyLogoUrl?: string;
  companyIdentityUnlocked?: boolean;
}

type CompanyUnlockStatus = "none" | "pending" | "approved" | "declined";

export function StudentJobDetailView({ labels }: { labels: Record<string, string> }) {
  const params = useParams<{ id: string }>();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [companyUnlockStatus, setCompanyUnlockStatus] =
    useState<CompanyUnlockStatus>("none");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    const res = await fetch(`/api/student/jobs/${params.id}`);
    if (!res.ok) {
      setStatus("error");
      return;
    }
    const data = (await res.json()) as {
      job: JobDetail;
      alreadyApplied: boolean;
      matchId?: string | null;
      companyUnlockStatus?: CompanyUnlockStatus;
    };
    setJob(data.job);
    setAlreadyApplied(data.alreadyApplied);
    setMatchId(data.matchId ?? null);
    setCompanyUnlockStatus(
      data.companyUnlockStatus ??
        (data.job.companyIdentityUnlocked ? "approved" : "none"),
    );
    setStatus("ready");
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const apply = async () => {
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/student/jobs/${params.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "apply" }),
    });
    setBusy(false);
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        id?: string;
      };
      if (payload.error === "already_applied") {
        setAlreadyApplied(true);
        if (payload.id) setMatchId(payload.id);
        setMessage(labels.alreadyApplied);
        return;
      }
      setMessage(labels.applyError);
      return;
    }
    const payload = (await res.json().catch(() => ({}))) as { id?: string };
    setAlreadyApplied(true);
    if (payload.id) setMatchId(payload.id);
    setMessage(labels.applySuccess);
  };

  const revealEmployer = async () => {
    if (!alreadyApplied) return;
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/student/company-unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matchId: matchId || undefined,
        jobPostingId: params.id,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setMessage(labels.revealEmployerError || labels.loadError);
      return;
    }
    const payload = (await res.json().catch(() => ({}))) as {
      companyUnlockStatus?: CompanyUnlockStatus;
    };
    setCompanyUnlockStatus(payload.companyUnlockStatus ?? "pending");
    await load();
  };

  if (status === "loading") {
    return <EmptyState title={labels.loading || ""} />;
  }
  if (status === "error" || !job) {
    return <EmptyState title={labels.notFound || labels.loadError || ""} />;
  }

  const unlocked =
    companyUnlockStatus === "approved" || job.companyIdentityUnlocked === true;
  const displayEmployer =
    unlocked && job.companyName ? job.companyName : job.employerLabel;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/student/jobs"
        className="text-sm text-text-secondary hover:text-text-primary"
      >
        {labels.backToJobs}
      </Link>

      <header className="space-y-2">
        <h1 className="font-serif text-3xl text-text-primary">{job.title}</h1>
        <p className="text-sm text-text-secondary">
          {[displayEmployer, job.location, job.employmentType]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {!unlocked && labels.maskedEmployerHint ? (
          <p className="text-xs text-text-muted">{labels.maskedEmployerHint}</p>
        ) : null}
        {job.salary ? (
          <p className="text-sm text-text-primary">
            {labels.salaryLabel}: {job.salary}
          </p>
        ) : null}
        {unlocked && job.companyWebsite ? (
          <a
            href={job.companyWebsite}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-text-label hover:text-fill-accent"
          >
            {job.companyWebsite}
          </a>
        ) : null}
      </header>

      <div className="whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
        {job.description}
      </div>

      {job.skills?.length ? (
        <ul className="flex flex-wrap gap-1.5">
          {job.skills.map((skill) => (
            <li
              key={skill}
              className="rounded-radius bg-bg-tag px-2 py-0.5 text-xs text-text-tag"
            >
              {skill}
            </li>
          ))}
        </ul>
      ) : null}

      {message ? (
        <p className="text-sm text-text-secondary" role="status">
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button disabled={busy || alreadyApplied} onClick={() => void apply()}>
          {alreadyApplied
            ? labels.alreadyApplied
            : busy
              ? labels.applying
              : labels.applyCta || labels.apply}
        </Button>

        {alreadyApplied && !unlocked ? (
          companyUnlockStatus === "pending" ? (
            <span className="inline-flex min-h-10 items-center rounded-radius-sm border border-border px-3 text-xs font-medium text-text-secondary">
              {labels.revealEmployerPending}
            </span>
          ) : (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void revealEmployer()}
            >
              {labels.revealEmployerCta}
            </Button>
          )
        ) : null}

        {unlocked ? (
          <span className="inline-flex min-h-10 items-center rounded-radius-sm bg-bg-purple px-3 text-xs font-medium text-text-label">
            {labels.revealEmployerDone}
          </span>
        ) : null}
      </div>
    </div>
  );
}
