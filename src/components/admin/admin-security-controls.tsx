"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui";
import { FormPersistBar } from "@/components/ui/form-persist-bar";
import { useDebouncedAutosave } from "@/hooks/use-debounced-autosave";

interface AdminSecurityControlsProps {
  labels: Record<string, string>;
  initialSessionExpireDays: number;
  onSaved?: (
    patch: Record<string, string | number | boolean | null>,
  ) => void;
}

export function AdminSecurityControls({
  labels,
  initialSessionExpireDays,
  onSaved,
}: AdminSecurityControlsProps) {
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
    setSessionExpireDays(String(initialSessionExpireDays));
    setHydrated(true);
  }, [initialSessionExpireDays]);

  const persistDays = async (raw: string) => {
    const days = Number(raw);
    if (!Number.isFinite(days) || days < 1 || days > 14) {
      setMessage(labels.sessionExpireInvalid || "Enter 1–14 days.");
      return false;
    }
    setIsSaving(true);
    setMessage(null);
    const next = { sessionExpireDays: Math.round(days) };
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
    suppressRef.current?.();
    setSessionExpireDays(String(next.sessionExpireDays));
    setMessage(labels.saveSuccess || "Saved.");
    onSavedRef.current?.(next);
    return true;
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
