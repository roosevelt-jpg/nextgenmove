"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Input } from "@/components/ui";
import { FileUpload, type FileUploadMetadata } from "@/components/ui/file-upload";
import type { CompanyDocument } from "@/lib/employer/session";
import { useDebouncedAutosave } from "@/hooks/use-debounced-autosave";

export interface CompanySettingsViewProps {
  labels: Record<string, string>;
  notificationKeys: string[];
}

type CompanyDraft = {
  name: string;
  contactEmail: string;
  logoUrl: string | null;
  industry: string;
  preferredLocations: string;
  requirementTags: string;
  hiringNeeds: string;
  notificationPreferences: Record<string, boolean>;
};

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
  const [hydrated, setHydrated] = useState(false);
  const suppressRef = useRef<(() => void) | null>(null);

  const draft = useMemo<CompanyDraft | null>(() => {
    if (!hydrated) return null;
    return {
      name,
      contactEmail,
      logoUrl,
      industry,
      preferredLocations,
      requirementTags,
      hiringNeeds,
      notificationPreferences,
    };
  }, [
    hydrated,
    name,
    contactEmail,
    logoUrl,
    industry,
    preferredLocations,
    requirementTags,
    hiringNeeds,
    notificationPreferences,
  ]);

  const persistDraft = useCallback(
    async (next: CompanyDraft) => {
      if (!next.name.trim() || !next.contactEmail.trim()) {
        return false;
      }
      const response = await fetch("/api/employer/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: next.name,
          contactEmail: next.contactEmail,
          logoUrl: next.logoUrl || null,
          industry: next.industry.trim() || undefined,
          preferredLocations: next.preferredLocations
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          requirementTags: next.requirementTags
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          hiringNeeds: next.hiringNeeds.trim() || undefined,
          notificationPreferences: next.notificationPreferences,
        }),
      });
      if (!response.ok) {
        setStatusMessage(labels.saveError || "Could not save.");
        return false;
      }
      setStatusMessage(labels.saveSuccess || "Saved.");
      return true;
    },
    [labels.saveError, labels.saveSuccess],
  );

  const { status: autosaveStatus, suppressNext } = useDebouncedAutosave(
    draft,
    persistDraft,
    { enabled: hydrated, delayMs: 800 },
  );
  useEffect(() => {
    suppressRef.current = suppressNext;
  }, [suppressNext]);

  const loadCompany = useCallback(async () => {
    const response = await fetch("/api/employer/company");
    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as { company: CompanyDocument };
    suppressRef.current?.();
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
    setHydrated(true);
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
    if (!draft) return;
    setIsSaving(true);
    setStatusMessage(null);
    const ok = await persistDraft(draft);
    setIsSaving(false);
    if (ok) {
      await loadCompany();
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
          suppressRef.current?.();
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

      {statusMessage || autosaveStatus !== "idle" ? (
        <p className="text-sm text-text-secondary" role="status">
          {autosaveStatus === "saving"
            ? labels.saving || "Saving…"
            : autosaveStatus === "error"
              ? labels.saveError || "Could not save."
              : statusMessage ||
                (autosaveStatus === "saved"
                  ? labels.saveSuccess || "Saved."
                  : null)}
        </p>
      ) : null}

      <Button type="submit" disabled={isSaving || autosaveStatus === "saving"}>
        {isSaving || autosaveStatus === "saving"
          ? labels.saving || "Saving…"
          : labels.save || "Save"}
      </Button>
    </form>
  );
}
