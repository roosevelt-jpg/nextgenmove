"use client";

import type { AdminFieldSchema } from "@/lib/admin/entity-schemas";
import {
  COLLECTION_FIELD_STATIC_OPTIONS,
  STATIC_SELECT_OPTIONS,
} from "@/lib/admin/entity-schemas";
import type { TaxonomiesDocument } from "@/types/cms";
import { Input, Select, Textarea } from "@/components/ui";
import { FileUpload, type FileUploadMetadata } from "@/components/ui/file-upload";
import { looksLikeHtml, stripHtmlToPlainText } from "@/lib/content/plain-text";

function asPlainText(value: unknown): string {
  const raw = value == null ? "" : String(value);
  return looksLikeHtml(raw) ? stripHtmlToPlainText(raw) : raw;
}

function getSelectOptions(
  field: AdminFieldSchema,
  taxonomies: TaxonomiesDocument,
  entityCollection?: string,
): { value: string; label: string }[] {
  if (field.taxonomyKey && taxonomies[field.taxonomyKey]) {
    return taxonomies[field.taxonomyKey] ?? [];
  }

  const collectionStaticKey =
    entityCollection &&
    COLLECTION_FIELD_STATIC_OPTIONS[entityCollection]?.[field.key];

  const staticKey = collectionStaticKey ?? `${field.labelKey}_${field.key}`;

  return (
    STATIC_SELECT_OPTIONS[staticKey] ??
    STATIC_SELECT_OPTIONS[field.labelKey] ??
    STATIC_SELECT_OPTIONS[field.key] ??
    []
  );
}

function getNestedValue(values: Record<string, unknown>, key: string): unknown {
  return values[key];
}

function setNestedValue(
  values: Record<string, unknown>,
  key: string,
  value: unknown,
): Record<string, unknown> {
  return { ...values, [key]: value };
}

export interface AdminFieldRendererProps {
  field: AdminFieldSchema;
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  labels: Record<string, string>;
  taxonomies: TaxonomiesDocument;
  storagePath: string;
  entityCollection?: string;
}

export function AdminFieldRenderer({
  field,
  values,
  onChange,
  labels,
  taxonomies,
  storagePath,
  entityCollection,
}: AdminFieldRendererProps) {
  const label = labels[field.labelKey] ?? field.labelKey;
  const value = getNestedValue(values, field.key);

  if (field.type === "object" && field.fields) {
    const obj =
      value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};

    return (
      <fieldset className="space-y-3 rounded-radius border border-border p-3">
        {label ? (
          <legend className="text-sm font-medium text-text-secondary">{label}</legend>
        ) : null}
        {field.fields.map((nested) => (
          <AdminFieldRenderer
            key={nested.key}
            field={nested}
            values={obj}
            labels={labels}
            taxonomies={taxonomies}
            storagePath={storagePath}
            entityCollection={entityCollection}
            onChange={(nextObj) =>
              onChange(setNestedValue(values, field.key, nextObj))
            }
          />
        ))}
      </fieldset>
    );
  }

  if (field.type === "keyvalue") {
    const record =
      value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, string>)
        : {};
    const rows = Object.entries(record).map(([entryKey, entryValue]) => ({
      key: entryKey,
      value: entryValue,
    }));

    return (
      <fieldset className="space-y-3 rounded-radius border border-border p-3">
        {label ? (
          <legend className="text-sm font-medium text-text-secondary">{label}</legend>
        ) : null}
        {rows.map((row, index) => (
          <div
            key={`${row.key}-${index}`}
            className="grid gap-2 rounded-radius bg-surface-2 p-3 sm:grid-cols-[1fr_1fr_auto]"
          >
            <Input
              id={`${field.key}-key-${index}`}
              label={labels.keyLabel ?? "key"}
              value={row.key}
              onChange={(event) => {
                const nextRows = [...rows];
                nextRows[index] = { ...row, key: event.target.value };
                const nextRecord: Record<string, string> = {};
                for (const item of nextRows) {
                  if (item.key.trim()) {
                    nextRecord[item.key.trim()] = item.value ?? "";
                  }
                }
                onChange(setNestedValue(values, field.key, nextRecord));
              }}
            />
            <Input
              id={`${field.key}-value-${index}`}
              label={labels.valueLabel ?? "value"}
              value={row.value}
              onChange={(event) => {
                const nextRows = [...rows];
                nextRows[index] = { ...row, value: event.target.value };
                const nextRecord: Record<string, string> = {};
                for (const item of nextRows) {
                  if (item.key.trim()) {
                    nextRecord[item.key.trim()] = item.value ?? "";
                  }
                }
                onChange(setNestedValue(values, field.key, nextRecord));
              }}
            />
            <button
              type="button"
              className="self-end text-xs text-text-warning"
              onClick={() => {
                const nextRows = rows.filter((_, rowIndex) => rowIndex !== index);
                const nextRecord: Record<string, string> = {};
                for (const item of nextRows) {
                  if (item.key.trim()) {
                    nextRecord[item.key.trim()] = item.value ?? "";
                  }
                }
                onChange(setNestedValue(values, field.key, nextRecord));
              }}
            >
              {labels.removeRow}
            </button>
          </div>
        ))}
        <button
          type="button"
          className="text-xs text-text-accent"
          onClick={() => {
            onChange(
              setNestedValue(values, field.key, {
                ...record,
                [`new_key_${rows.length + 1}`]: "",
              }),
            );
          }}
        >
          {labels.addRow}
        </button>
      </fieldset>
    );
  }

  if (field.type === "repeatable" && field.fields) {
    const rows = Array.isArray(value)
      ? value.map((row) =>
          typeof row === "string"
            ? { chip: row }
            : ((row as Record<string, unknown>) ?? {}),
        )
      : [];

    return (
      <fieldset className="space-y-3 rounded-radius border border-border p-3">
        {label ? <legend className="text-sm font-medium text-text-secondary">{label}</legend> : null}
        {rows.map((row, index) => (
          <div key={index} className="space-y-2 rounded-radius bg-surface-2 p-3">
            {field.fields!.map((nested) => (
              <AdminFieldRenderer
                key={nested.key}
                field={nested}
                values={row}
                labels={labels}
                taxonomies={taxonomies}
                storagePath={storagePath}
                entityCollection={entityCollection}
                onChange={(nextRow) => {
                  const nextRows = [...rows];
                  nextRows[index] = nextRow;
                  onChange(setNestedValue(values, field.key, nextRows));
                }}
              />
            ))}
            <button
              type="button"
              className="text-xs text-text-warning"
              onClick={() => {
                const nextRows = rows.filter((_, rowIndex) => rowIndex !== index);
                onChange(setNestedValue(values, field.key, nextRows));
              }}
            >
              {labels.removeRow}
            </button>
          </div>
        ))}
        <button
          type="button"
          className="text-xs text-text-accent"
          onClick={() => {
            onChange(setNestedValue(values, field.key, [...rows, {}]));
          }}
        >
          {labels.addRow}
        </button>
      </fieldset>
    );
  }

  if (field.type === "boolean") {
    return (
      <label className="flex items-center gap-2 text-sm text-text-primary">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) =>
            onChange(setNestedValue(values, field.key, event.target.checked))
          }
        />
        {label}
      </label>
    );
  }

  if (field.type === "select") {
    const options = getSelectOptions(field, taxonomies, entityCollection).map(
      (option) => ({
        value: option.value,
        label: labels[option.label] ?? option.label,
      }),
    );
    return (
      <Select
        id={field.key}
        label={label}
        value={String(value ?? "")}
        options={options}
        onChange={(event) => onChange(setNestedValue(values, field.key, event.target.value))}
      />
    );
  }

  if (field.type === "multiselect") {
    const current = Array.isArray(value) ? (value as string[]).join(", ") : String(value ?? "");
    return (
      <Input
        id={field.key}
        label={label}
        value={current}
        onChange={(event) =>
          onChange(
            setNestedValue(
              values,
              field.key,
              event.target.value
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
            ),
          )
        }
      />
    );
  }

  if (field.type === "textarea" || field.type === "richtext") {
    return (
      <Textarea
        id={field.key}
        label={label}
        value={asPlainText(value)}
        onChange={(event) =>
          onChange(
            setNestedValue(
              values,
              field.key,
              stripHtmlToPlainText(event.target.value),
            ),
          )
        }
      />
    );
  }

  if (field.type === "number") {
    return (
      <Input
        id={field.key}
        type="number"
        label={label}
        value={value == null ? "" : String(value)}
        onChange={(event) =>
          onChange(setNestedValue(values, field.key, Number(event.target.value)))
        }
      />
    );
  }

  if (field.type === "date") {
    return (
      <Input
        id={field.key}
        type="date"
        label={label}
        value={String(value ?? "").slice(0, 10)}
        onChange={(event) => onChange(setNestedValue(values, field.key, event.target.value))}
      />
    );
  }

  if (field.type === "image" || field.type === "file") {
    return (
      <div className="space-y-2">
        <FileUpload
          storagePath={storagePath}
          accept={field.type === "image" ? "image/*" : undefined}
          label={label}
          dropzoneContent={labels.uploadDropzone}
          progressLabel={labels.uploadProgress}
          onUploadComplete={(result: FileUploadMetadata) =>
            onChange(setNestedValue(values, field.key, result.url))
          }
        />
        {value ? (
          <p className="truncate text-xs text-text-muted">{String(value)}</p>
        ) : null}
      </div>
    );
  }

  return (
    <Input
      id={field.key}
      label={label}
      value={asPlainText(value)}
      required={field.required}
      onChange={(event) =>
        onChange(
          setNestedValue(
            values,
            field.key,
            stripHtmlToPlainText(event.target.value),
          ),
        )
      }
    />
  );
}
