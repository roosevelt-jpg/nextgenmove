"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button, EmptyState } from "@/components/ui";

interface JobDetail {
  id: string;
  title: string;
  companyName: string;
  description: string;
  location: string;
  salary: string;
  employmentType: string;
  categories: string[];
  skills: string[];
}

export function StudentJobDetailView({ labels }: { labels: Record<string, string> }) {
  const params = useParams<{ id: string }>();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [error, setError] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/student/jobs/${params.id}`);
    if (!res.ok) {
      setError(true);
      return;
    }
    const data = (await res.json()) as {
      job: JobDetail;
      alreadyApplied: boolean;
    };
    setJob(data.job);
    setAlreadyApplied(data.alreadyApplied);
    setError(false);
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
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (payload.error === "already_applied") {
        setAlreadyApplied(true);
        setMessage(labels.alreadyApplied || "Already applied");
        return;
      }
      setMessage(labels.applyError || "Could not apply. Try again.");
      return;
    }
    setAlreadyApplied(true);
    setMessage(labels.applySuccess || "Application submitted.");
  };

  if (error) {
    return <EmptyState title={labels.notFound || "Job not found"} />;
  }
  if (!job) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/student/jobs"
        className="text-sm text-text-secondary hover:text-text-primary"
      >
        {labels.backToJobs || "← Job board"}
      </Link>

      <header className="space-y-2">
        <h1 className="font-serif text-3xl text-text-primary">{job.title}</h1>
        <p className="text-sm text-text-secondary">
          {[job.companyName, job.location, job.employmentType]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {job.salary ? (
          <p className="text-sm text-text-primary">
            {labels.salaryLabel || "Salary"}: {job.salary}
          </p>
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

      <Button disabled={busy || alreadyApplied} onClick={() => void apply()}>
        {alreadyApplied
          ? labels.alreadyApplied || "Already applied"
          : busy
            ? labels.applying || "Applying…"
            : labels.apply || "Apply"}
      </Button>
    </div>
  );
}
