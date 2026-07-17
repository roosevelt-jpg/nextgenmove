"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Input } from "@/components/ui";
import { FileUpload, type FileUploadMetadata } from "@/components/ui/file-upload";
import type { CompanyDocument } from "@/lib/employer/session";

export interface CompanySettingsViewProps {
  labels: Record<string, string>;
  notificationKeys: string[];
}

export function CompanySettingsView({
  labels,
  notificationKeys,
}: CompanySettingsViewProps) {
  const [company, setCompany] = useState<CompanyDocument | null>(null);
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [industry, setIndustry] = useState("");
  const [preferredLocations, setPreferredLocations] = useState("");
  const [requirementTags, setRequirementTags] = useState("");
  const [hiringNeeds, setHiringNeeds] = useState("");
  const [notificationPreferences, setNotificationPreferences] = useState<
    Record<string, boolean>
  >({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadCompany = useCallback(async () => {
    const response = await fetch("/api/employer/company");
    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as { company: CompanyDocument };
    setCompany(data.company);
    setName(data.company.name);
    setContactEmail(data.company.contactEmail);
    setLogoUrl(data.company.logoUrl);
    setIndustry(data.company.industry ?? "");
    setPreferredLocations((data.company.preferredLocations ?? []).join(", "));
    setRequirementTags((data.company.requirementTags ?? []).join(", "));
    setHiringNeeds(data.company.hiringNeeds ?? "");
    const stored = data.company.notificationPreferences ?? {};
    const nextPrefs: Record<string, boolean> = {};
    for (const key of notificationKeys) {
      nextPrefs[key] = Object.prototype.hasOwnProperty.call(stored, key)
        ? Boolean(stored[key])
        : true;
    }
    setNotificationPreferences(nextPrefs);
  }, [notificationKeys]);

  useEffect(() => {
    void loadCompany();
  }, [loadCompany]);

  const persistNotificationPreferences = async (
    next: Record<string, boolean>,
  ) => {
    const response = await fetch("/api/employer/company", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationPreferences: next }),
    });
    if (response.ok) {
      setStatusMessage(
        labels.prefsSaved || labels.saveSuccess || "Preferences saved.",
      );
    } else {
      setStatusMessage(labels.saveError || "Could not save.");
    }
  };

  const toggleNotification = (key: string, checked: boolean) => {
    const next = { ...notificationPreferences, [key]: checked };
    setNotificationPreferences(next);
    void persistNotificationPreferences(next);
  };

  const saveSettings = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    const response = await fetch("/api/employer/company", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        contactEmail,
        logoUrl,
        industry: industry.trim() || undefined,
        preferredLocations: preferredLocations
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        requirementTags: requirementTags
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        hiringNeeds: hiringNeeds.trim() || undefined,
        notificationPreferences,
      }),
    });

    setIsSaving(false);

    if (response.ok) {
      setStatusMessage(labels.saveSuccess ?? "");
      await loadCompany();
    } else {
      setStatusMessage(labels.saveError ?? "");
    }
  };

  if (!company) {
    return null;
  }

  return (
    <form className="max-w-xl space-y-4" onSubmit={saveSettings}>
      <Input
        id="settings-company-name"
        required
        aria-label={labels.companyName ?? "company-name"}
        label={labels.companyName || "Company name"}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <Input
        id="settings-contact-email"
        type="email"
        required
        aria-label={labels.contactEmail || "Contact email"}
        label={labels.contactEmail || "Contact email"}
        value={contactEmail}
        onChange={(event) => setContactEmail(event.target.value)}
      />
      <Input
        id="settings-industry"
        aria-label={labels.industry ?? "industry"}
        label={labels.industry || "Industry"}
        value={industry}
        onChange={(event) => setIndustry(event.target.value)}
      />
      <Input
        id="settings-preferred-locations"
        aria-label={labels.preferredLocations || "Preferred locations"}
        label={labels.preferredLocations || "Preferred locations"}
        value={preferredLocations}
        onChange={(event) => setPreferredLocations(event.target.value)}
        placeholder={labels.preferredLocationsHint || "City1, City2"}
      />
      <Input
        id="settings-requirement-tags"
        aria-label={labels.requirementTags || "Hiring requirement tags"}
        label={labels.requirementTags || "Hiring requirement tags"}
        value={requirementTags}
        onChange={(event) => setRequirementTags(event.target.value)}
        placeholder={labels.requirementTagsHint || "skill, skill, skill"}
      />
      <Input
        id="settings-hiring-needs"
        aria-label={labels.hiringNeeds || "Hiring needs"}
        label={labels.hiringNeeds || "Hiring needs"}
        value={hiringNeeds}
        onChange={(event) => setHiringNeeds(event.target.value)}
      />
      <FileUpload
        storagePath={`companies/${company.id}/logo`}
        uploadEndpoint="/api/employer/upload"
        uploadKind="logo"
        accept="image/*"
        label={labels.logoUpload || "Company logo"}
        dropzoneContent={labels.logoDropzone || "JPG or PNG"}
        progressLabel={labels.uploadProgress || "Uploading…"}
        onUploadComplete={async (result: FileUploadMetadata) => {
          setLogoUrl(result.url);
          const response = await fetch("/api/employer/company", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ logoUrl: result.url }),
          });
          setStatusMessage(
            response.ok
              ? labels.logoSaved ?? labels.saveSuccess ?? "Logo saved."
              : labels.saveError ?? "Could not save logo.",
          );
        }}
      />
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={labels.logoPreview ?? "logo"} className="h-16 w-auto" />
      ) : null}

      {notificationKeys.length ? (
        <fieldset className="space-y-2">
          {labels.notificationsTitle ? (
            <legend className="text-sm font-medium text-text-secondary">
              {labels.notificationsTitle}
            </legend>
          ) : null}
          {notificationKeys.map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm text-text-primary">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--fill-accent)]"
                checked={Boolean(notificationPreferences[key])}
                onChange={(event) =>
                  toggleNotification(key, event.target.checked)
                }
              />
              {labels[`notification_${key}`] || key}
            </label>
          ))}
        </fieldset>
      ) : null}

      {statusMessage ? (
        <p className="text-sm text-text-secondary" role="status">
          {statusMessage}
        </p>
      ) : null}

      <Button type="submit" disabled={isSaving} className="!text-white">
        {labels.save || "Save"}
      </Button>
    </form>
  );
}
