"use client";

import { useState } from "react";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { FileUpload, type FileUploadMetadata } from "@/components/ui/file-upload";
import { useTaxonomies } from "@/lib/hooks/use-taxonomies";

export interface RequestTalentFormProps {
  labels: Record<string, string>;
}

export function RequestTalentForm({ labels }: RequestTalentFormProps) {
  const { taxonomies, isLoading } = useTaxonomies();
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [roleTitleNeeded, setRoleTitleNeeded] = useState("");
  const [sector, setSector] = useState("");
  const [location, setLocation] = useState("");
  const [numberOfHires, setNumberOfHires] = useState("");
  const [preferredTrack, setPreferredTrack] = useState("");
  const [timeline, setTimeline] = useState("");
  const [additionalRequirements, setAdditionalRequirements] = useState("");
  const [jobDescriptionFileUrl, setJobDescriptionFileUrl] = useState("");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorCode(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/requests/sourcing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          contactName,
          workEmail,
          phone: phone || null,
          roleTitleNeeded,
          sector,
          location,
          numberOfHires: Number(numberOfHires),
          preferredTrack,
          timeline,
          additionalRequirements: additionalRequirements || null,
          jobDescriptionFileUrl: jobDescriptionFileUrl || null,
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
    <form className="flex max-w-2xl flex-col gap-4" onSubmit={handleSubmit}>
      <Input
        id="request-company-name"
        required
        aria-label={labels.companyName ?? "company-name"}
        label={labels.companyName}
        value={companyName}
        onChange={(event) => setCompanyName(event.target.value)}
      />
      <Input
        id="request-contact-name"
        required
        aria-label={labels.contactName ?? "contact-name"}
        label={labels.contactName}
        value={contactName}
        onChange={(event) => setContactName(event.target.value)}
      />
      <Input
        id="request-work-email"
        type="email"
        required
        aria-label={labels.workEmail ?? "work-email"}
        label={labels.workEmail}
        value={workEmail}
        onChange={(event) => setWorkEmail(event.target.value)}
      />
      <Input
        id="request-phone"
        type="tel"
        aria-label={labels.phone ?? "phone"}
        label={labels.phone}
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
      />
      <Input
        id="request-role-title"
        required
        aria-label={labels.roleTitleNeeded ?? "role-title"}
        label={labels.roleTitleNeeded}
        value={roleTitleNeeded}
        onChange={(event) => setRoleTitleNeeded(event.target.value)}
      />
      <Select
        id="request-sector"
        required
        disabled={isLoading}
        aria-label={labels.sector ?? "sector"}
        label={labels.sector}
        value={sector}
        placeholder={labels.sectorPlaceholder}
        options={taxonomies.sector ?? []}
        onChange={(event) => setSector(event.target.value)}
      />
      <Input
        id="request-location"
        required
        aria-label={labels.location ?? "location"}
        label={labels.location}
        value={location}
        onChange={(event) => setLocation(event.target.value)}
      />
      <Input
        id="request-number-of-hires"
        type="number"
        min={1}
        required
        aria-label={labels.numberOfHires ?? "number-of-hires"}
        label={labels.numberOfHires}
        value={numberOfHires}
        onChange={(event) => setNumberOfHires(event.target.value)}
      />

      <fieldset className="space-y-2">
        {labels.preferredTrack ? (
          <legend className="text-sm font-medium text-text-secondary">
            {labels.preferredTrack}
          </legend>
        ) : null}
        {(taxonomies.preferredTrack ?? []).map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm text-text-primary">
            <input
              type="radio"
              name="preferredTrack"
              required
              value={option.value}
              checked={preferredTrack === option.value}
              onChange={() => setPreferredTrack(option.value)}
            />
            {option.label}
          </label>
        ))}
      </fieldset>

      <Select
        id="request-timeline"
        required
        disabled={isLoading}
        aria-label={labels.timeline ?? "timeline"}
        label={labels.timeline}
        value={timeline}
        placeholder={labels.timelinePlaceholder}
        options={taxonomies.timeline ?? []}
        onChange={(event) => setTimeline(event.target.value)}
      />
      <Textarea
        id="request-additional-requirements"
        aria-label={labels.additionalRequirements ?? "additional-requirements"}
        label={labels.additionalRequirements}
        value={additionalRequirements}
        onChange={(event) => setAdditionalRequirements(event.target.value)}
      />
      <FileUpload
        storagePath="requests/sourcing"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        label={labels.jobDescriptionUpload}
        dropzoneContent={labels.jobDescriptionDropzone}
        progressLabel={labels.uploadProgress}
        onUploadComplete={(result: FileUploadMetadata) =>
          setJobDescriptionFileUrl(result.url)
        }
      />
      {errorCode ? (
        <p className="text-sm text-text-warning" role="alert">
          {labels[errorCode] ?? labels.genericError ?? errorCode}
        </p>
      ) : null}
      <Button type="submit" disabled={isSubmitting || isLoading}>
        {labels.submit}
      </Button>
    </form>
  );
}
