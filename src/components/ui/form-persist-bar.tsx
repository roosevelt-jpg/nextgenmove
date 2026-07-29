"use client";

import { Button } from "@/components/ui/button";
import type { AutosaveStatus } from "@/hooks/use-debounced-autosave";
import { cn } from "@/lib/utils";

export interface FormPersistBarProps {
  status: AutosaveStatus;
  labels?: {
    save?: string;
    saving?: string;
    saved?: string;
    saveError?: string;
    autosaveHint?: string;
  };
  message?: string | null;
  isSaving?: boolean;
  disabled?: boolean;
  onSave?: () => void | Promise<void>;
  saveType?: "button" | "submit";
  className?: string;
}

function statusText(
  status: AutosaveStatus,
  labels: FormPersistBarProps["labels"],
  message?: string | null,
  busy?: boolean,
): string | null {
  // Button already shows "Saving…" — avoid a duplicate blinking status label.
  if (status === "saving") {
    if (busy && (!message || message === (labels?.saving || "Saving…"))) {
      return null;
    }
    return message || labels?.saving || "Saving…";
  }
  if (status === "error") {
    return message || labels?.saveError || "Could not save.";
  }
  if (status === "saved") return message || labels?.saved || "Saved.";
  if (message) return message;
  return labels?.autosaveHint || "Changes save automatically";
}

export function FormPersistBar({
  status,
  labels,
  message,
  isSaving = false,
  disabled = false,
  onSave,
  saveType = "button",
  className,
}: FormPersistBarProps) {
  const busy = isSaving || status === "saving";
  const text = statusText(status, labels, message, busy);

  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-3 border-t border-border bg-surface-1/95 px-1 py-3 backdrop-blur-sm",
        className,
      )}
    >
      {onSave || saveType === "submit" ? (
        <Button
          type={saveType}
          disabled={disabled || busy}
          onClick={
            saveType === "button" && onSave
              ? () => {
                  void onSave();
                }
              : undefined
          }
        >
          {busy ? labels?.saving || "Saving…" : labels?.save || "Save"}
        </Button>
      ) : null}
      {text ? (
        <p
          className={cn(
            "text-xs",
            status === "error" ? "text-text-warning" : "text-text-muted",
          )}
          aria-live="polite"
          role="status"
        >
          {text}
        </p>
      ) : null}
    </div>
  );
}
