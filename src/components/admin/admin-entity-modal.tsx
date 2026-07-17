"use client";

import { useEffect, useRef, useState } from "react";
import type { AdminEntitySchema } from "@/lib/admin/entity-schemas";
import type { TaxonomiesDocument } from "@/types/cms";
import { Button, Modal } from "@/components/ui";
import { AdminFieldRenderer } from "@/components/admin/admin-field-renderer";
import { slugifyPageName } from "@/lib/public/slugify";

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

function appliesTitleSlug(collection: string) {
  return collection === "cms_pages" || collection === "cms_forms";
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
  const slugSyncedFromTitle = useRef(true);

  useEffect(() => {
    if (open) {
      setValues(initialValues);
      setErrorCode(null);
      const title = String(initialValues.title ?? "");
      const slug = String(initialValues.slug ?? "");
      slugSyncedFromTitle.current =
        !entityId || !slug || slug === slugifyPageName(title);
    }
  }, [open, initialValues, entityId]);

  const handleChange = (next: Record<string, unknown>) => {
    if (!appliesTitleSlug(schema.collection)) {
      setValues(next);
      return;
    }

    const prevTitle = String(values.title ?? "");
    const nextTitle = String(next.title ?? "");
    const nextSlug = String(next.slug ?? "");
    const prevSlug = String(values.slug ?? "");

    if (nextSlug !== prevSlug && nextTitle === prevTitle) {
      slugSyncedFromTitle.current = false;
      setValues(next);
      return;
    }

    if (nextTitle !== prevTitle && slugSyncedFromTitle.current) {
      setValues({
        ...next,
        slug: slugifyPageName(nextTitle),
      });
      return;
    }

    setValues(next);
  };

  const save = async () => {
    setIsSaving(true);
    setErrorCode(null);

    const payload = { ...values };
    if (appliesTitleSlug(schema.collection)) {
      const title = String(payload.title ?? "");
      const slug = String(payload.slug ?? "").trim();
      if (!slug && title) {
        payload.slug = slugifyPageName(title);
      }
      if (schema.collection === "cms_pages" && payload.showInHeader == null) {
        payload.showInHeader = false;
      }
      if (
        schema.collection === "cms_pages" &&
        (payload.footerGroup == null || payload.footerGroup === "")
      ) {
        payload.footerGroup = "none";
      }
    }

    const response = await fetch(
      entityId
        ? `/api/admin/data/${schema.collection}/${entityId}`
        : `/api/admin/data/${schema.collection}`,
      {
        method: entityId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    setIsSaving(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setErrorCode(body?.error ?? "save_failed");
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
            {labels.cancel || "Cancel"}
          </Button>
          <Button disabled={isSaving} onClick={save}>
            {labels.save || "Save"}
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
            onChange={handleChange}
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
