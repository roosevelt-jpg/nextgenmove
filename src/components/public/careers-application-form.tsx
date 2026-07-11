"use client";

import { useMemo, useState } from "react";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { FileUpload, type FileUploadMetadata } from "@/components/ui/file-upload";
import type { JobPostingDocument } from "@/types/cms";

export interface CareersApplicationFormProps {
  jobs?: JobPostingDocument[];
  /** When set, role is fixed (detail page). */
  job?: JobPostingDocument;
  labels: Record<string, string>;
  allowGeneral?: boolean;
}

const GENERAL_ID = "__general__";

export function CareersApplicationForm({
  jobs = [],
  job,
  labels,
  allowGeneral = false,
}: CareersApplicationFormProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [coverNote, setCoverNote] = useState("");
  const [cvUrl, setCvUrl] = useState("");
  const [selectedJobId, setSelectedJobId] = useState(
    job?.id ?? (allowGeneral ? GENERAL_ID : jobs[0]?.id ?? ""),
  );
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const coverNoteLength = coverNote.length;
  const coverNoteMax = 500;
  const roleLocked = Boolean(job);

  const roleOptions = useMemo(() => {
    const options = jobs.map((item) => ({
      value: item.id,
      label: item.title,
    }));
    if (allowGeneral) {
      options.unshift({
        value: GENERAL_ID,
        label: labels.generalApplication ?? "General application",
      });
    }
    return options;
  }, [allowGeneral, jobs, labels.generalApplication]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorCode(null);
    setIsSubmitting(true);

    const jobPostingId =
      roleLocked && job
        ? job.id
        : selectedJobId === GENERAL_ID
          ? null
          : selectedJobId;

    try {
      const response = await fetch("/api/careers/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobPostingId,
          fullName,
          email,
          linkedinUrl,
          cvUrl,
          coverNote,
          isGeneral: jobPostingId === null,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? "submit_failed");
      }

      setIsSubmitted(true);
    } catch (error) {
      setErrorCode(error instanceof Error ? error.message : "submit_failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return labels.successMessage ? (
      <p className="text-sm text-text-success">{labels.successMessage}</p>
    ) : null;
  }

  const storagePath = `careers/applications/${job?.id ?? (selectedJobId || "general")}`;

  return (
    <form className="flex max-w-xl flex-col gap-4" onSubmit={handleSubmit}>
      <Input
        id="careers-full-name"
        required
        aria-label={labels.fullName ?? "full-name"}
        label={labels.fullName}
        value={fullName}
        onChange={(event) => setFullName(event.target.value)}
      />
      <Input
        id="careers-email"
        type="email"
        required
        aria-label={labels.email ?? "email"}
        label={labels.email}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      {roleLocked && job ? (
        <Input
          id="careers-role"
          readOnly
          aria-label={labels.roleApplyingFor ?? job.title}
          label={labels.roleApplyingFor}
          value={job.title}
        />
      ) : (
        <Select
          id="careers-role-select"
          label={labels.roleApplyingFor}
          required
          value={selectedJobId}
          options={roleOptions}
          onChange={(event) => setSelectedJobId(event.target.value)}
        />
      )}
      <Input
        id="careers-linkedin"
        type="url"
        aria-label={labels.linkedinUrl ?? "linkedin-url"}
        label={labels.linkedinUrl}
        value={linkedinUrl}
        onChange={(event) => setLinkedinUrl(event.target.value)}
      />
      <FileUpload
        storagePath={storagePath}
        accept=".pdf,application/pdf"
        label={labels.cvUpload}
        dropzoneContent={labels.cvDropzone}
        progressLabel={labels.uploadProgress}
        onUploadComplete={(result: FileUploadMetadata) => setCvUrl(result.url)}
      />
      <Textarea
        id="careers-cover-note"
        required
        maxLength={coverNoteMax}
        aria-label={labels.coverNote ?? "cover-note"}
        label={labels.coverNote}
        value={coverNote}
        onChange={(event) => setCoverNote(event.target.value)}
      />
      {labels.coverNoteCounter ? (
        <p className="text-xs text-text-muted">
          {labels.coverNoteCounter.replace("{count}", String(coverNoteLength))}
        </p>
      ) : (
        <p className="text-xs text-text-muted" aria-live="polite">
          {coverNoteLength}/{coverNoteMax}
        </p>
      )}
      {errorCode ? (
        <p className="text-sm text-text-warning" role="alert">
          {labels[errorCode] ?? labels.genericError ?? errorCode}
        </p>
      ) : null}
      <Button type="submit" disabled={isSubmitting || !cvUrl}>
        {labels.submit}
      </Button>
    </form>
  );
}
