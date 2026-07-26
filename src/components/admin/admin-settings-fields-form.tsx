"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input, Textarea } from "@/components/ui";
import { FormPersistBar } from "@/components/ui/form-persist-bar";
import { FileUpload, type FileUploadMetadata } from "@/components/ui/file-upload";
import { useDebouncedAutosave } from "@/hooks/use-debounced-autosave";
import { cn } from "@/lib/utils";

export type SettingsFieldKind =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "url"
  | "image";

export interface SettingsFieldDef {
  key: string;
  kind: SettingsFieldKind;
  labelKey: string;
  helpKey?: string;
  readOnly?: boolean;
}

interface AdminSettingsFieldsFormProps {
  labels: Record<string, string>;
  fields: SettingsFieldDef[];
  initialValues: Record<string, string | number | boolean | null | undefined>;
  className?: string;
  onSaved?: (
    patch: Record<string, string | number | boolean | null>,
  ) => void;
}

function Switch({
  checked,
  disabled,
  onChange,
  onLabel,
  offLabel,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  onLabel?: string;
  offLabel?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={
        checked
          ? "relative h-5 w-9 shrink-0 rounded-full bg-text-success"
          : "relative h-5 w-9 shrink-0 rounded-full bg-border"
      }
    >
      <span
        className={
          checked
            ? "absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-white"
            : "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white"
        }
      />
      <span className="sr-only">{checked ? onLabel : offLabel}</span>
    </button>
  );
}

function toDraft(
  fields: SettingsFieldDef[],
  initialValues: Record<string, string | number | boolean | null | undefined>,
): Record<string, string | boolean> {
  const next: Record<string, string | boolean> = {};
  for (const field of fields) {
    const raw = initialValues[field.key];
    if (field.kind === "boolean") {
      next[field.key] = Boolean(raw);
    } else {
      next[field.key] = raw == null ? "" : String(raw);
    }
  }
  return next;
}

function toPersistBody(
  fields: SettingsFieldDef[],
  draft: Record<string, string | boolean>,
): Record<string, string | number | boolean | null> {
  const body: Record<string, string | number | boolean | null> = {};
  for (const field of fields) {
    if (field.readOnly) continue;
    const value = draft[field.key];
    if (field.kind === "boolean") {
      body[field.key] = Boolean(value);
    } else if (field.kind === "number") {
      const n = Number(value);
      body[field.key] = Number.isFinite(n) ? n : null;
    } else {
      const text = String(value ?? "").trim();
      body[field.key] = text || null;
    }
  }
  return body;
}

export function AdminSettingsFieldsForm({
  labels,
  fields,
  initialValues,
  className,
  onSaved,
}: AdminSettingsFieldsFormProps) {
  const [values, setValues] = useState(() => toDraft(fields, initialValues));
  const [hydrated, setHydrated] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const suppressRef = useRef<(() => void) | null>(null);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  const sourceKey = useMemo(
    () =>
      JSON.stringify(
        fields.map((field) => [field.key, initialValues[field.key] ?? null]),
      ),
    [fields, initialValues],
  );

  useEffect(() => {
    suppressRef.current?.();
    setValues(toDraft(fields, initialValues));
    setHydrated(true);
    // Sync only when server/parent values actually change, not on object identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sourceKey encodes fields + values
  }, [sourceKey]);

  const persist = async (draft: Record<string, string | boolean>) => {
    const body = toPersistBody(fields, draft);

    try {
      const response = await fetch("/api/admin/data/site_settings/default", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        setMessage(labels.saveError || "Could not save.");
        return false;
      }

      setMessage(labels.saveSuccess || labels.saved || "Saved.");
      onSavedRef.current?.(body);
      return true;
    } catch {
      setMessage(labels.saveError || "Could not save.");
      return false;
    }
  };

  const { status, suppressNext, flush } = useDebouncedAutosave(
    hydrated ? values : null,
    persist,
    { enabled: hydrated, delayMs: 700 },
  );
  useEffect(() => {
    suppressRef.current = suppressNext;
  }, [suppressNext]);

  const saveNow = async () => {
    setIsSaving(true);
    setMessage(null);
    await flush();
    setIsSaving(false);
  };

  return (
    <div className={cn("space-y-5", className)}>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => {
          const label = labels[field.labelKey] ?? field.labelKey;
          const help = field.helpKey ? labels[field.helpKey] : undefined;
          const value = values[field.key];

          if (field.kind === "boolean") {
            return (
              <div
                key={field.key}
                className="flex items-center justify-between gap-4 rounded-radius-sm border border-border bg-surface-1/60 px-3 py-3 sm:col-span-2"
              >
                <div>
                  <p className="text-sm font-medium text-text-primary">{label}</p>
                  {help ? (
                    <p className="mt-0.5 text-xs text-text-muted">{help}</p>
                  ) : null}
                </div>
                <Switch
                  checked={Boolean(value)}
                  disabled={field.readOnly}
                  onChange={(next) =>
                    setValues((prev) => ({ ...prev, [field.key]: next }))
                  }
                  onLabel={labels.toggleOn}
                  offLabel={labels.toggleOff}
                />
              </div>
            );
          }

          if (field.kind === "image") {
            const url = String(value ?? "");
            return (
              <div key={field.key} className="space-y-2 sm:col-span-2">
                <p className="text-sm font-medium text-text-primary">{label}</p>
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={url}
                    alt=""
                    className="h-16 w-16 rounded-radius-sm border border-border object-cover"
                  />
                ) : null}
                {!field.readOnly ? (
                  <FileUpload
                    storagePath={`site-branding/${field.key}`}
                    uploadEndpoint="/api/admin/upload"
                    accept="image/*"
                    uploadKind={field.key}
                    label={labels.uploadImage || "Upload image"}
                    dropzoneContent={
                      labels.uploadDropzone || "Drop an image or choose a file"
                    }
                    progressLabel={labels.uploadProgress}
                    onUploadComplete={(result: FileUploadMetadata) => {
                      setValues((prev) => ({
                        ...prev,
                        [field.key]: result.url,
                      }));
                    }}
                    onError={() =>
                      setMessage(labels.uploadError || "Upload failed.")
                    }
                  />
                ) : null}
                {help ? (
                  <p className="mt-1 text-xs text-text-muted">{help}</p>
                ) : null}
              </div>
            );
          }

          if (field.kind === "textarea") {
            return (
              <div key={field.key} className="sm:col-span-2">
                <Textarea
                  id={`settings-${field.key}`}
                  rows={3}
                  label={label}
                  readOnly={field.readOnly}
                  value={String(value ?? "")}
                  onChange={(event) =>
                    setValues((prev) => ({
                      ...prev,
                      [field.key]: event.target.value,
                    }))
                  }
                />
                {help ? (
                  <p className="mt-1 text-xs text-text-muted">{help}</p>
                ) : null}
              </div>
            );
          }

          return (
            <div
              key={field.key}
              className={field.kind === "url" ? "sm:col-span-2" : undefined}
            >
              <Input
                id={`settings-${field.key}`}
                type={
                  field.kind === "number"
                    ? "number"
                    : field.kind === "url"
                      ? "url"
                      : "text"
                }
                label={label}
                readOnly={field.readOnly}
                value={String(value ?? "")}
                onChange={(event) =>
                  setValues((prev) => ({
                    ...prev,
                    [field.key]: event.target.value,
                  }))
                }
              />
              {help ? (
                <p className="mt-1 text-xs text-text-muted">{help}</p>
              ) : null}
            </div>
          );
        })}
      </div>

      <FormPersistBar
        status={status}
        isSaving={isSaving}
        message={message}
        onSave={saveNow}
        labels={{
          save: labels.save,
          saving: labels.saving,
          saved: labels.saveSuccess || labels.saved,
          saveError: labels.saveError,
          autosaveHint: labels.autosaveHint,
        }}
      />
    </div>
  );
}
