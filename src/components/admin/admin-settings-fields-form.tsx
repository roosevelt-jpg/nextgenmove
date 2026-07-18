"use client";

import { useEffect, useRef, useState } from "react";
import { Input, Textarea } from "@/components/ui";
import { useDebouncedAutosave } from "@/hooks/use-debounced-autosave";
import { cn } from "@/lib/utils";

export type SettingsFieldKind = "text" | "textarea" | "number" | "boolean" | "url";

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

export function AdminSettingsFieldsForm({
  labels,
  fields,
  initialValues,
  className,
}: AdminSettingsFieldsFormProps) {
  const [values, setValues] = useState<Record<string, string | boolean>>(() => {
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
  });
  const [hydrated, setHydrated] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const suppressRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    suppressRef.current?.();
    const next: Record<string, string | boolean> = {};
    for (const field of fields) {
      const raw = initialValues[field.key];
      if (field.kind === "boolean") {
        next[field.key] = Boolean(raw);
      } else {
        next[field.key] = raw == null ? "" : String(raw);
      }
    }
    setValues(next);
    setHydrated(true);
  }, [fields, initialValues]);

  const persist = async (draft: Record<string, string | boolean>) => {
    const body: Record<string, unknown> = {};
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

    const response = await fetch("/api/admin/data/site_settings/default", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      setMessage(labels.saveError ?? "Could not save.");
      return false;
    }

    setMessage(labels.saveSuccess ?? "Saved.");
    return true;
  };

  const { status, suppressNext } = useDebouncedAutosave(
    hydrated ? values : null,
    persist,
    { enabled: hydrated, delayMs: 700 },
  );
  suppressRef.current = suppressNext;

  const statusLabel =
    status === "saving"
      ? labels.saving
      : status === "saved"
        ? labels.saveSuccess
        : status === "error"
          ? labels.saveError
          : message;

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

      {statusLabel ? (
        <p
          className={cn(
            "text-xs",
            status === "error" ? "text-text-warning" : "text-text-muted",
          )}
          aria-live="polite"
        >
          {statusLabel}
        </p>
      ) : null}
    </div>
  );
}
