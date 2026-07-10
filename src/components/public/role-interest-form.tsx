"use client";

import { useState } from "react";
import { Button, Input, Textarea } from "@/components/ui";
import { FileUpload, type FileUploadMetadata } from "@/components/ui/file-upload";
import type { PublicRoleDocument } from "@/types/cms";

export interface RoleInterestFormProps {
  role: PublicRoleDocument;
  labels: Record<string, string>;
}

export function RoleInterestForm({ role, labels }: RoleInterestFormProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [currentCity, setCurrentCity] = useState("");
  const [whyThisRole, setWhyThisRole] = useState("");
  const [cvUrl, setCvUrl] = useState("");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorCode(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/roles/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicRoleId: role.id,
          fullName,
          email,
          currentCity,
          cvUrl,
          whyThisRole,
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
        id="interest-full-name"
        required
        aria-label={labels.fullName ?? "full-name"}
        label={labels.fullName}
        value={fullName}
        onChange={(event) => setFullName(event.target.value)}
      />
      <Input
        id="interest-email"
        type="email"
        required
        aria-label={labels.email ?? "email"}
        label={labels.email}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <Input
        id="interest-current-city"
        required
        aria-label={labels.currentCity ?? "current-city"}
        label={labels.currentCity}
        value={currentCity}
        onChange={(event) => setCurrentCity(event.target.value)}
      />
      <FileUpload
        storagePath={`roles/interest/${role.id}`}
        accept=".pdf,application/pdf"
        label={labels.cvUpload}
        dropzoneContent={labels.cvDropzone}
        progressLabel={labels.uploadProgress}
        onUploadComplete={(result: FileUploadMetadata) => setCvUrl(result.url)}
      />
      <Textarea
        id="interest-why"
        required
        aria-label={labels.whyThisRole ?? "why-this-role"}
        label={labels.whyThisRole}
        value={whyThisRole}
        onChange={(event) => setWhyThisRole(event.target.value)}
      />
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
