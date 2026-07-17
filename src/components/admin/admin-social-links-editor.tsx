"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Input, Select } from "@/components/ui";
import type { SocialLink } from "@/types/cms";
import { SOCIAL_PLATFORM_KEYS } from "@/lib/public/social";
import { useDebouncedAutosave } from "@/hooks/use-debounced-autosave";

interface AdminSocialLinksEditorProps {
  labels: Record<string, string>;
  initialLinks: SocialLink[];
}

type DraftRow = {
  id: string;
  key: string;
  label: string;
  url: string;
};

function toDraft(links: SocialLink[]): DraftRow[] {
  return links.map((link, index) => ({
    id: `${link.key}-${index}`,
    key: link.key || "other",
    label: link.label ?? "",
    url: link.url ?? "",
  }));
}

function platformOptionLabel(
  key: string,
  labels: Record<string, string>,
): string {
  const map: Record<string, string> = {
    linkedin: labels.platformLinkedin ?? "LinkedIn",
    instagram: labels.platformInstagram ?? "Instagram",
    x: labels.platformX ?? "X",
    facebook: labels.platformFacebook ?? "Facebook",
    youtube: labels.platformYoutube ?? "YouTube",
    tiktok: labels.platformTiktok ?? "TikTok",
    whatsapp: labels.platformWhatsapp ?? "WhatsApp",
    github: labels.platformGithub ?? "GitHub",
    other: labels.platformOther ?? "Other",
  };
  return map[key] ?? key;
}

export function AdminSocialLinksEditor({
  labels,
  initialLinks,
}: AdminSocialLinksEditorProps) {
  const [rows, setRows] = useState<DraftRow[]>(() => toDraft(initialLinks));
  const [hydrated, setHydrated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const suppressRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    suppressRef.current?.();
    setRows(toDraft(initialLinks));
    setHydrated(true);
  }, [initialLinks]);

  const options = SOCIAL_PLATFORM_KEYS.map((key) => ({
    value: key,
    label: platformOptionLabel(key, labels),
  }));

  const persistRows = async (nextRows: DraftRow[]) => {
    const socialLinks: SocialLink[] = nextRows
      .map((row) => ({
        key: row.key.trim() || "other",
        label: row.label.trim() || platformOptionLabel(row.key, labels),
        url: row.url.trim(),
      }))
      .filter((link) => Boolean(link.url));

    const response = await fetch("/api/admin/data/site_settings/default", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ socialLinks }),
    });

    if (!response.ok) {
      setMessage(labels.saveError ?? "Could not save social links.");
      return false;
    }

    setMessage(labels.saveSuccess ?? "Saved.");
    return true;
  };

  const { status: autosaveStatus, suppressNext } = useDebouncedAutosave(
    hydrated ? rows : null,
    persistRows,
    { enabled: hydrated, delayMs: 700 },
  );
  suppressRef.current = suppressNext;

  const updateRow = (id: string, patch: Partial<DraftRow>) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        key: "linkedin",
        label: "",
        url: "",
      },
    ]);
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  const save = async () => {
    setIsSaving(true);
    setMessage(null);
    await persistRows(rows);
    setIsSaving(false);
  };

  return (
    <div className="space-y-4">
      {labels.socialLinksHelp ? (
        <p className="text-sm text-text-secondary">{labels.socialLinksHelp}</p>
      ) : null}

      <div className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-text-muted">
            {labels.socialLinksEmpty ?? "No social links yet."}
          </p>
        ) : (
          rows.map((row) => (
            <div
              key={row.id}
              className="grid gap-2 border-b border-border pb-3 sm:grid-cols-[10rem_1fr_1fr_auto]"
            >
              <Select
                label={labels.socialPlatform ?? labels.socialKey}
                value={row.key}
                options={options}
                onChange={(event) =>
                  updateRow(row.id, { key: event.target.value })
                }
              />
              <Input
                label={labels.socialUrl}
                value={row.url}
                placeholder="https://"
                onChange={(event) =>
                  updateRow(row.id, { url: event.target.value })
                }
              />
              <Input
                label={labels.socialLabel}
                value={row.label}
                onChange={(event) =>
                  updateRow(row.id, { label: event.target.value })
                }
              />
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => removeRow(row.id)}
                >
                  {labels.removeRow ?? "Remove"}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" onClick={addRow}>
          {labels.addSocialLink ?? labels.addRow ?? "Add link"}
        </Button>
        <Button type="button" onClick={() => void save()} disabled={isSaving}>
          {isSaving || autosaveStatus === "saving"
            ? (labels.saving ?? "Saving…")
            : (labels.saveSocialLinks ?? labels.save ?? "Save")}
        </Button>
        {message || autosaveStatus === "saved" ? (
          <p className="text-xs text-text-muted">
            {message ?? labels.saveSuccess ?? "Saved."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
