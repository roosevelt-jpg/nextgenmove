"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Input } from "@/components/ui";
import { FormPersistBar } from "@/components/ui/form-persist-bar";
import { FileUpload, type FileUploadMetadata } from "@/components/ui/file-upload";
import type { CompanyDocument } from "@/lib/employer/session";
import { useDebouncedAutosave } from "@/hooks/use-debounced-autosave";
import { clearSession } from "@/lib/auth-client";

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
  autoTopUpThreshold: string;
  autoTopUpPackId: string;
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
  const [autoTopUpThreshold, setAutoTopUpThreshold] = useState("");
  const [autoTopUpPackId, setAutoTopUpPackId] = useState("");
  const [creditPacks, setCreditPacks] = useState<
    Array<{ id: string; label: string; credits: number }>
  >([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [consentRecords, setConsentRecords] = useState<
    Array<{
      id: string;
      source: string;
      marketing: boolean;
      createdAt: string | null;
    }>
  >([]);
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
      autoTopUpThreshold,
      autoTopUpPackId,
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
    autoTopUpThreshold,
    autoTopUpPackId,
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
          autoTopUpThreshold:
            next.autoTopUpThreshold.trim() === ""
              ? null
              : Number(next.autoTopUpThreshold),
          autoTopUpPackId: next.autoTopUpPackId.trim() || null,
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

  const { status: autosaveStatus, suppressNext, flush } = useDebouncedAutosave(
    draft,
    persistDraft,
    { enabled: hydrated, delayMs: 800 },
  );
  useEffect(() => {
    suppressRef.current = suppressNext;
  }, [suppressNext]);

  const loadCompany = useCallback(async () => {
    const [companyRes, creditsRes, consentsRes] = await Promise.all([
      fetch("/api/employer/company"),
      fetch("/api/employer/credits/top-up"),
      fetch("/api/employer/consents"),
    ]);
    if (!companyRes.ok) {
      return;
    }

    const data = (await companyRes.json()) as { company: CompanyDocument };
    suppressRef.current?.();
    setCompany(data.company);
    setName(data.company.name);
    setContactEmail(data.company.contactEmail);
    setLogoUrl(data.company.logoUrl);
    setIndustry(data.company.industry ?? "");
    setPreferredLocations((data.company.preferredLocations ?? []).join(", "));
    setRequirementTags((data.company.requirementTags ?? []).join(", "));
    setHiringNeeds(data.company.hiringNeeds ?? "");
    setAutoTopUpThreshold(
      data.company.autoTopUpThreshold != null
        ? String(data.company.autoTopUpThreshold)
        : "",
    );
    setAutoTopUpPackId(data.company.autoTopUpPackId ?? "");
    const stored = data.company.notificationPreferences ?? {};
    const nextPrefs: Record<string, boolean> = {};
    for (const key of notificationKeys) {
      nextPrefs[key] = Object.prototype.hasOwnProperty.call(stored, key)
        ? Boolean(stored[key])
        : true;
    }
    setNotificationPreferences(nextPrefs);
    if (creditsRes.ok) {
      const creditsPayload = (await creditsRes.json()) as {
        packages?: Array<{ id: string; label: string; credits: number }>;
      };
      setCreditPacks(creditsPayload.packages ?? []);
    }
    if (consentsRes.ok) {
      const consentsPayload = (await consentsRes.json()) as {
        records: Array<{
          id: string;
          source: string;
          marketing: boolean;
          createdAt: string | null;
        }>;
      };
      setConsentRecords(consentsPayload.records ?? []);
    }
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
    const ok = await flush();
    setIsSaving(false);
    if (ok) {
      await loadCompany();
    }
  };

  if (!company) {
    return null;
  }

  return (
    <>
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
      <div className="space-y-3 rounded-radius border border-border px-3 py-3">
        <p className="font-mono text-[11px] uppercase tracking-wide text-text-label">
          Auto top-up
        </p>
        <Input
          id="settings-auto-topup-threshold"
          type="number"
          min={0}
          label={labels.autoTopUpThreshold || "Auto top-up when credits fall below"}
          value={autoTopUpThreshold}
          onChange={(event) => setAutoTopUpThreshold(event.target.value)}
          placeholder="e.g. 100"
        />
        <label className="block space-y-1 text-sm">
          <span className="text-text-secondary">
            {labels.autoTopUpPack || "Auto top-up pack"}
          </span>
          <select
            className="w-full rounded-radius-sm border border-border bg-surface-1 px-2 py-1.5"
            value={autoTopUpPackId}
            onChange={(event) => setAutoTopUpPackId(event.target.value)}
          >
            <option value="">Off</option>
            {creditPacks.map((pack) => (
              <option key={pack.id} value={pack.id}>
                {pack.label} · {pack.credits} credits
              </option>
            ))}
          </select>
        </label>
      </div>
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

      <FormPersistBar
        status={autosaveStatus}
        isSaving={isSaving}
        message={statusMessage}
        saveType="submit"
        labels={{
          save: labels.save,
          saving: labels.saving,
          saved: labels.saveSuccess || labels.saved,
          saveError: labels.saveError,
          autosaveHint: labels.autosaveHint,
        }}
      />
    </form>

    <section className="mt-8 max-w-xl space-y-4 rounded-radius border border-border bg-grad-card p-5">
      <h2 className="font-serif text-xl text-text-primary">
        {labels.privacyTitle || "Privacy & data"}
      </h2>
      <p className="text-sm text-text-secondary">
        {labels.exportIntro ||
          "Download a JSON copy of your company profile, unlocks, credit ledger, and matches summary."}
      </p>
      <Button
        type="button"
        variant="outline"
        disabled={exportBusy}
        onClick={() => {
          void (async () => {
            setExportBusy(true);
            setStatusMessage(null);
            try {
              const response = await fetch("/api/employer/compliance/export", {
                cache: "no-store",
              });
              if (!response.ok) {
                setStatusMessage(labels.exportFailed || "Could not export data.");
                return;
              }
              const blob = await response.blob();
              const url = URL.createObjectURL(blob);
              const anchor = document.createElement("a");
              anchor.href = url;
              anchor.download = "nextgenmove-company-export.json";
              anchor.click();
              URL.revokeObjectURL(url);
              setStatusMessage(labels.exportReady || "Export downloaded.");
            } finally {
              setExportBusy(false);
            }
          })();
        }}
      >
        {exportBusy
          ? labels.exporting || "Exporting…"
          : labels.exportMyData || "Export my data"}
      </Button>
      <div className="space-y-2 pt-2">
        <p className="font-mono text-[11px] uppercase tracking-wide text-text-label">
          {labels.consentTimelineTitle || "Consent timeline"}
        </p>
        {consentRecords.length === 0 ? (
          <p className="text-sm text-text-muted">
            {labels.consentEmpty || "No consent records yet."}
          </p>
        ) : (
          <ul className="space-y-2">
            {consentRecords.map((record) => (
              <li
                key={record.id}
                className="rounded-radius border border-border px-3 py-2 text-sm"
              >
                <p className="text-text-primary">
                  {record.source}
                  {record.marketing ? " · marketing" : ""}
                </p>
                <p className="font-mono text-xs text-text-muted">
                  {record.createdAt
                    ? new Date(record.createdAt).toLocaleString()
                    : "—"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="space-y-2 border-t border-border pt-4">
        <h3 className="font-serif text-lg text-text-primary">
          {labels.dangerZoneTitle || "Deactivate account"}
        </h3>
        <p className="text-sm text-text-secondary">
          {labels.deactivateDescription ||
            "Anonymize company PII and suspend this account. This cannot be undone."}
        </p>
        <Button
          type="button"
          variant="outline"
          disabled={isDeactivating}
          onClick={() => {
            void (async () => {
              setIsDeactivating(true);
              const response = await fetch("/api/employer/deactivate", {
                method: "POST",
              });
              if (response.ok) {
                await clearSession();
                window.location.href = "/sign-in";
                return;
              }
              setIsDeactivating(false);
              setStatusMessage(
                labels.deactivateFailed || "Could not deactivate account.",
              );
            })();
          }}
        >
          {labels.deactivateAccount || "Deactivate account"}
        </Button>
      </div>
    </section>
    </>
  );
}
