"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";

interface AdminSecurityControlsProps {
  labels: Record<string, string>;
  initialRequire2fa: boolean;
  initialSessionExpireDays: number;
}

export function AdminSecurityControls({
  labels,
  initialRequire2fa,
  initialSessionExpireDays,
}: AdminSecurityControlsProps) {
  const [require2fa, setRequire2fa] = useState(initialRequire2fa);
  const [sessionExpireDays, setSessionExpireDays] = useState(
    String(initialSessionExpireDays),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
      setMessage(labels.saveError ?? "Could not save security settings.");
      return;
    }

    if (typeof next.require2fa === "boolean") {
      setRequire2fa(next.require2fa);
    }
    if (typeof next.sessionExpireDays === "number") {
      setSessionExpireDays(String(next.sessionExpireDays));
    }
    setMessage(labels.saveSuccess ?? "Saved.");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4 border-b border-border py-2">
        <div>
          <p className="font-medium text-text-primary">{labels.require2fa}</p>
          <p className="text-xs text-text-muted">{labels.require2faHelp}</p>
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

      <div className="flex flex-wrap items-end justify-between gap-4 py-2">
        <div className="min-w-[12rem] flex-1">
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
        <Button
          type="button"
          size="sm"
          disabled={isSaving}
          onClick={() => {
            const days = Number(sessionExpireDays);
            if (!Number.isFinite(days) || days < 1 || days > 14) {
              setMessage(labels.sessionExpireInvalid ?? "Enter 1–14 days.");
              return;
            }
            void save({ sessionExpireDays: Math.round(days) });
          }}
        >
          {labels.save ?? "Save"}
        </Button>
      </div>

      {message ? (
        <p className="text-sm text-text-secondary" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
