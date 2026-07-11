"use client";

import { useState } from "react";
import { Button, Modal } from "@/components/ui";

export interface AdminCrmImportModalProps {
  open: boolean;
  onClose: () => void;
  labels: Record<string, string>;
  onImported: () => void;
}

type ImportTarget = "students" | "companies";

export function AdminCrmImportModal({
  open,
  onClose,
  labels,
  onImported,
}: AdminCrmImportModalProps) {
  const [target, setTarget] = useState<ImportTarget>("students");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reset = () => {
    setFile(null);
    setResultMessage(null);
    setErrorMessage(null);
    setIsUploading(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const downloadTemplate = () => {
    window.location.href = `/api/admin/crm/import?target=${target}`;
  };

  const submit = async () => {
    if (!file) {
      setErrorMessage(labels.importMissingFile ?? "Choose a CSV or Excel file.");
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setResultMessage(null);

    const body = new FormData();
    body.append("target", target);
    body.append("file", file);

    const response = await fetch("/api/admin/crm/import", {
      method: "POST",
      body,
    });

    setIsUploading(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setErrorMessage(
        labels[payload?.error ?? ""] ??
          labels.importError ??
          payload?.error ??
          "Import failed.",
      );
      return;
    }

    const summary = (await response.json()) as {
      created: number;
      updated: number;
      skipped: number;
    };

    setResultMessage(
      (labels.importSuccess ??
        "Imported: {created} created, {updated} updated, {skipped} skipped.")
        .replace("{created}", String(summary.created))
        .replace("{updated}", String(summary.updated))
        .replace("{skipped}", String(summary.skipped)),
    );
    onImported();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={labels.importTitle ?? "Import contacts"}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={close}>
            {labels.close ?? "Close"}
          </Button>
          <Button size="sm" disabled={isUploading} onClick={() => void submit()}>
            {isUploading
              ? (labels.importUploading ?? "Importing…")
              : (labels.importSubmit ?? "Import")}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          {labels.importHelp ??
            "Upload a CSV or Excel (.xlsx) file. Matching emails update existing Students or Companies; new emails create CRM records (no login account)."}
        </p>

        <div className="space-y-2">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
            {labels.importTarget ?? "Import into"}
          </p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["students", labels.studentsTab ?? "Students"],
                ["companies", labels.companiesTab ?? "Companies"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTarget(value)}
                className={
                  target === value
                    ? "rounded-full bg-fill-accent px-2.5 py-0.5 text-[11px] font-semibold text-on-accent"
                    : "rounded-full bg-surface-2 px-2.5 py-0.5 text-[11px] font-semibold text-text-secondary"
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-secondary">
            {labels.importFile ?? "File"}
            <input
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              className="mt-1 block w-full text-sm text-text-primary file:mr-3 file:rounded-radius file:border-0 file:bg-surface-2 file:px-2 file:py-1 file:text-xs"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setResultMessage(null);
                setErrorMessage(null);
              }}
            />
          </label>
          {file ? (
            <p className="text-xs text-text-muted">{file.name}</p>
          ) : null}
        </div>

        <Button size="xs" variant="outline" type="button" onClick={downloadTemplate}>
          {labels.importDownloadTemplate ?? "Download CSV template"}
        </Button>

        {errorMessage ? (
          <p className="text-sm text-text-warning" role="alert">
            {errorMessage}
          </p>
        ) : null}
        {resultMessage ? (
          <p className="text-sm text-text-secondary" role="status">
            {resultMessage}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
