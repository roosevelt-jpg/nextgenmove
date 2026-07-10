"use client";

import { useMemo, useState } from "react";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { FileUpload, type FileUploadMetadata } from "@/components/ui/file-upload";
import type { JobPostingDocument } from "@/types/cms";

export interface CareersApplicationFormProps {
  job: JobPostingDocument;
  labels: Record<string, string>;
}

export function CareersApplicationForm({ job, labels }: CareersApplicationFormProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [coverNote, setCoverNote] = useState("");
  const [cvUrl, setCvUrl] = useState("");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const coverNoteLength = coverNote.length;
  const coverNoteMax = 500;

  const roleLabel = useMemo(
    () => labels.roleApplyingFor ?? job.title,
    [job.title, labels.roleApplyingFor],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorCode(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/careers/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobPostingId: job.id,
          fullName,
          email,
          linkedinUrl,
          cvUrl,
          coverNote,
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
      <Input
        id="careers-role"
        readOnly
        aria-label={roleLabel}
        label={labels.roleApplyingFor}
        value={job.title}
      />
      <Input
        id="careers-linkedin"
        type="url"
        aria-label={labels.linkedinUrl ?? "linkedin-url"}
        label={labels.linkedinUrl}
        value={linkedinUrl}
        onChange={(event) => setLinkedinUrl(event.target.value)}
      />
      <FileUpload
        storagePath={`careers/applications/${job.id}`}
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
