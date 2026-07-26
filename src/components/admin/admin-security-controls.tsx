"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui";
import { FormPersistBar } from "@/components/ui/form-persist-bar";
import { useDebouncedAutosave } from "@/hooks/use-debounced-autosave";

interface AdminSecurityControlsProps {
  labels: Record<string, string>;
  initialRequire2fa: boolean;
  initialSessionExpireDays: number;
  onSaved?: (
    patch: Record<string, string | number | boolean | null>,
  ) => void;
}

export function AdminSecurityControls({
  labels,
  initialRequire2fa,
  initialSessionExpireDays,
  onSaved,
}: AdminSecurityControlsProps) {
  const [require2fa, setRequire2fa] = useState(initialRequire2fa);
  const [sessionExpireDays, setSessionExpireDays] = useState(
    String(initialSessionExpireDays),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const suppressRef = useRef<(() => void) | null>(null);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  useEffect(() => {
    suppressRef.current?.();
    setRequire2fa(initialRequire2fa);
    setSessionExpireDays(String(initialSessionExpireDays));
    setHydrated(true);
  }, [initialRequire2fa, initialSessionExpireDays]);

  const save = async (next: {
    require2fa?: boolean;
    sessionExpireDays?: number;
  }) => {
    setIsSaving(true);
    setMessage(null);

    const response = await fetch("/api/admin/data/site_settings/default", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });

    setIsSaving(false);

    if (!response.ok) {
      setMessage(labels.saveError || "Could not save security settings.");
      return false;
    }

    if (typeof next.require2fa === "boolean") {
      setRequire2fa(next.require2fa);
    }
    if (typeof next.sessionExpireDays === "number") {
      suppressRef.current?.();
      setSessionExpireDays(String(next.sessionExpireDays));
    }
    setMessage(labels.saveSuccess || "Saved.");
    onSavedRef.current?.(next);
    return true;
  };

  const persistDays = async (raw: string) => {
    const days = Number(raw);
    if (!Number.isFinite(days) || days < 1 || days > 14) {
      setMessage(labels.sessionExpireInvalid || "Enter 1–14 days.");
      return false;
    }
    return save({ sessionExpireDays: Math.round(days) });
  };

  const { status: autosaveStatus, suppressNext, flush } = useDebouncedAutosave(
    hydrated ? sessionExpireDays : null,
    persistDays,
    { enabled: hydrated, delayMs: 700 },
  );
  useEffect(() => {
    suppressRef.current = suppressNext;
  }, [suppressNext]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4 border-b border-border py-2">
        <div>
          <p className="font-medium text-text-primary">
            {labels.require2fa ?? "Require two-factor authentication"}
          </p>
          <p className="text-xs text-text-muted">
            {labels.require2faHelp ??
              "Require email or SMS OTP at admin login (Firebase Auth phone + email code)."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={require2fa}
          disabled={isSaving}
          onClick={() => void save({ require2fa: !require2fa })}
          className={
            require2fa
              ? "relative h-5 w-9 shrink-0 rounded-full bg-text-success"
              : "relative h-5 w-9 shrink-0 rounded-full bg-border"
          }
        >
          <span
            className={
              require2fa
                ? "absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-white"
                : "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white"
            }
          />
          <span className="sr-only">
            {require2fa ? labels.toggleOn : labels.toggleOff}
          </span>
        </button>
      </div>

      <div className="py-2">
        <Input
          id="session-expire-days"
          type="number"
          min={1}
          max={14}
          label={labels.sessionExpireDays}
          value={sessionExpireDays}
          onChange={(event) => setSessionExpireDays(event.target.value)}
        />
        <p className="mt-1 text-xs text-text-muted">{labels.sessionExpireHelp}</p>
      </div>

      <FormPersistBar
        status={autosaveStatus}
        isSaving={isSaving}
        message={message}
        onSave={async () => {
          setIsSaving(true);
          setMessage(null);
          await flush();
          setIsSaving(false);
        }}
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
