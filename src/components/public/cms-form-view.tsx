"use client";

import { useMemo, useState } from "react";
import type { CmsFormDocument, CmsFormField } from "@/types/cms";
import { Button, Input, Select, Textarea } from "@/components/ui";

interface CmsFormViewProps {
  form: CmsFormDocument;
  labels: Record<string, string>;
}

export function CmsFormView({ form, labels }: CmsFormViewProps) {
  const fields = useMemo(() => form.fields ?? [], [form.fields]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorCode(null);
    setSubmitting(true);

    const response = await fetch(`/api/forms/${encodeURIComponent(form.slug)}/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({ values }),
    });

    setSubmitting(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setErrorCode(payload?.error ?? "submit_failed");
      return;
    }

    setSuccess(true);
    setValues({});
  };

  if (success) {
    return (
      <p className="rounded-radius border border-border bg-surface-1 px-4 py-3 text-sm text-text-primary">
        {form.successMessage || labels.formSuccess}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {form.description ? (
        <p className="text-sm text-text-secondary">{form.description}</p>
      ) : null}

      {fields.map((field) => (
        <FormFieldControl
          key={field.key}
          field={field}
          value={values[field.key] ?? ""}
          onChange={(next) =>
            setValues((prev) => ({
              ...prev,
              [field.key]: next,
            }))
          }
        />
      ))}

      {errorCode ? (
        <p className="text-sm text-text-warning" role="alert">
          {labels[errorCode] ?? labels.genericError ?? errorCode}
        </p>
      ) : null}

      <Button type="submit" disabled={submitting}>
        {form.submitLabel || labels.submit}
      </Button>
    </form>
  );
}

function FormFieldControl({
  field,
  value,
  onChange,
}: {
  field: CmsFormField;
  value: string;
  onChange: (value: string) => void;
}) {
  if (field.type === "textarea") {
    return (
      <Textarea
        id={field.key}
        label={field.label}
        required={field.required}
        placeholder={field.placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (field.type === "select") {
    const options = (field.options ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => ({ value: item, label: item }));

    return (
      <Select
        id={field.key}
        label={field.label}
        required={field.required}
        value={value}
        options={options}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  return (
    <Input
      id={field.key}
      type={field.type === "email" ? "email" : "text"}
      label={field.label}
      required={field.required}
      placeholder={field.placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
