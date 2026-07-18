"use client";

import { useEffect, useState } from "react";
import { AdminEntityModal } from "@/components/admin/admin-entity-modal";
import type {
  AdminEntitySchema,
  AdminFieldSchema,
} from "@/lib/admin/entity-schemas";
import type { TaxonomiesDocument } from "@/types/cms";
import { Button, EmptyState } from "@/components/ui";
import { looksLikeHtml, stripHtmlToPlainText } from "@/lib/content/plain-text";

interface AdminSingletonEditorProps {
  labels: Record<string, string>;
  formLabels: Record<string, string>;
  taxonomies: TaxonomiesDocument;
  schema: AdminEntitySchema;
  title: string;
}

function asPlainText(value: unknown): string {
  const raw = value == null ? "" : String(value);
  return looksLikeHtml(raw) ? stripHtmlToPlainText(raw) : raw;
}

function isEmptyValue(value: unknown): boolean {
  if (value == null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).length === 0;
  }
  if (typeof value === "boolean") return false;
  return String(value).trim().length === 0;
}

function FieldPreview({
  field,
  value,
  labels,
}: {
  field: AdminFieldSchema;
  value: unknown;
  labels: Record<string, string>;
}) {
  const label = labels[field.labelKey] || field.labelKey;

  if (field.type === "boolean") {
    return (
      <div className="space-y-1 border-b border-border py-3">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
          {label}
        </p>
        <p className="text-sm text-text-primary">
          {value ? labels.yes || "Yes" : labels.no || "No"}
        </p>
      </div>
    );
  }

  if (field.type === "image" || field.type === "file") {
    const url = asPlainText(value);
    return (
      <div className="space-y-1 border-b border-border py-3">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
          {label}
        </p>
        {url ? (
          field.type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt=""
              className="max-h-40 rounded-radius-sm border border-border object-cover"
            />
          ) : (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="break-all text-sm text-text-accent hover:underline"
            >
              {url}
            </a>
          )
        ) : (
          <p className="text-sm text-text-muted">—</p>
        )}
      </div>
    );
  }

  if (field.type === "object" && field.fields) {
    const obj =
      value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
    return (
      <div className="space-y-2 border-b border-border py-3">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
          {label}
        </p>
        <div className="rounded-radius border border-border bg-surface-2/40 px-3">
          {field.fields.map((nested) => (
            <FieldPreview
              key={nested.key}
              field={nested}
              value={obj[nested.key]}
              labels={labels}
            />
          ))}
        </div>
      </div>
    );
  }

  if (field.type === "repeatable" && field.fields) {
    const rows = Array.isArray(value) ? value : [];
    return (
      <div className="space-y-2 border-b border-border py-3">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
          {label}
        </p>
        {rows.length === 0 ? (
          <p className="text-sm text-text-muted">—</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row, index) => {
              const item: Record<string, unknown> =
                row && typeof row === "object" && !Array.isArray(row)
                  ? (row as Record<string, unknown>)
                  : { value: row };
              return (
                <li
                  key={index}
                  className="rounded-radius border border-border bg-surface-2/40 px-3 py-2"
                >
                  {field.fields!.map((nested) => (
                    <FieldPreview
                      key={nested.key}
                      field={nested}
                      value={item[nested.key]}
                      labels={labels}
                    />
                  ))}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  if (field.type === "keyvalue") {
    const entries =
      value && typeof value === "object" && !Array.isArray(value)
        ? Object.entries(value as Record<string, unknown>)
        : [];
    return (
      <div className="space-y-1 border-b border-border py-3">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
          {label}
        </p>
        {entries.length === 0 ? (
          <p className="text-sm text-text-muted">—</p>
        ) : (
          <dl className="space-y-1 text-sm">
            {entries.map(([key, val]) => (
              <div key={key} className="flex gap-2">
                <dt className="font-medium text-text-secondary">{key}:</dt>
                <dd className="text-text-primary">{asPlainText(val) || "—"}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    );
  }

  if (field.type === "multiselect") {
    const list = Array.isArray(value)
      ? value.map((item) => asPlainText(item)).filter(Boolean)
      : [];
    return (
      <div className="space-y-1 border-b border-border py-3">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
          {label}
        </p>
        <p className="text-sm text-text-primary">
          {list.length ? list.join(", ") : "—"}
        </p>
      </div>
    );
  }

  const text = asPlainText(value);
  return (
    <div className="space-y-1 border-b border-border py-3">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
        {label}
      </p>
      <p className="whitespace-pre-wrap text-sm text-text-primary">
        {text || "—"}
      </p>
    </div>
  );
}

export function AdminSingletonEditor({
  labels,
  formLabels,
  taxonomies,
  schema,
  title,
}: AdminSingletonEditorProps) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    const docId = schema.singletonId ?? "default";
    const response = await fetch(`/api/admin/data/${schema.collection}/${docId}`);
    if (response.ok) {
      const payload = (await response.json()) as { item: Record<string, unknown> };
      setValues(payload.item ?? {});
    }
    setLoaded(true);
  };

  useEffect(() => {
    void load();
  }, [schema.collection, schema.singletonId]);

  const hasContent = schema.fields.some((field) => !isEmptyValue(values[field.key]));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-3xl text-text-primary">{title}</h1>
        <Button onClick={() => setModalOpen(true)}>
          {labels.edit || "Edit"}
        </Button>
      </div>

      {!loaded ? (
        <p className="text-sm text-text-muted">{labels.loading || "Loading…"}</p>
      ) : !hasContent ? (
        <EmptyState
          title={labels.empty || "No content yet. Click Edit to add it."}
        />
      ) : (
        <section className="rounded-radius border border-border bg-grad-card px-4 py-1 sm:px-5">
          {schema.fields.map((field) => (
            <FieldPreview
              key={field.key}
              field={field}
              value={values[field.key]}
              labels={{ ...formLabels, ...labels }}
            />
          ))}
        </section>
      )}

      <AdminEntityModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        schema={schema}
        entityId={schema.singletonId ?? "default"}
        initialValues={values}
        labels={{
          ...formLabels,
          ...labels,
          cancel: labels.cancel || formLabels.cancel || "Cancel",
          save: labels.save || formLabels.save || "Save",
          createTitle:
            labels.createTitle || formLabels.createTitle || "Create",
          editTitle: labels.editTitle || formLabels.editTitle || "Edit",
          addRow: labels.addRow || formLabels.addRow || "Add row",
          removeRow: labels.removeRow || formLabels.removeRow || "Remove",
        }}
        taxonomies={taxonomies}
        onSaved={load}
      />
    </div>
  );
}
