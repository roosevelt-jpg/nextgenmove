"use client";

import { useEffect, useState } from "react";
import type { AdminEntitySchema } from "@/lib/admin/entity-schemas";
import type { TaxonomiesDocument } from "@/types/cms";
import { Button, Modal } from "@/components/ui";
import { AdminFieldRenderer } from "@/components/admin/admin-field-renderer";

export interface AdminEntityModalProps {
  open: boolean;
  onClose: () => void;
  schema: AdminEntitySchema;
  entityId?: string | null;
  initialValues?: Record<string, unknown>;
  labels: Record<string, string>;
  taxonomies: TaxonomiesDocument;
  onSaved: () => void;
}

export function AdminEntityModal({
  open,
  onClose,
  schema,
  entityId,
  initialValues = {},
  labels,
  taxonomies,
  onSaved,
}: AdminEntityModalProps) {
  const [values, setValues] = useState<Record<string, unknown>>(initialValues);
  const [isSaving, setIsSaving] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValues(initialValues);
      setErrorCode(null);
    }
  }, [open, initialValues]);

  const save = async () => {
    setIsSaving(true);
    setErrorCode(null);

    const response = await fetch(
      entityId
        ? `/api/admin/data/${schema.collection}/${entityId}`
        : `/api/admin/data/${schema.collection}`,
      {
        method: entityId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      },
    );

    setIsSaving(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setErrorCode(payload?.error ?? "save_failed");
      return;
    }

    onSaved();
    onClose();
  };

  const title = entityId ? labels.editTitle : labels.createTitle;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      className="max-w-2xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {labels.cancel}
          </Button>
          <Button disabled={isSaving} onClick={save}>
            {labels.save}
          </Button>
        </div>
      }
    >
      <div className="max-h-[70vh] space-y-4 overflow-y-auto">
        {schema.fields.map((field) => (
          <AdminFieldRenderer
            key={field.key}
            field={field}
            values={values}
            labels={labels}
            taxonomies={taxonomies}
            storagePath={`admin/${schema.collection}`}
            entityCollection={schema.collection}
            onChange={setValues}
          />
        ))}
        {errorCode ? (
          <p className="text-sm text-text-warning" role="alert">
            {labels[errorCode] ?? errorCode}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
