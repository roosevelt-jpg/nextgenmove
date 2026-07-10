"use client";

import { useEffect, useState } from "react";
import { AdminEntityModal } from "@/components/admin/admin-entity-modal";
import type { AdminEntitySchema } from "@/lib/admin/entity-schemas";
import type { TaxonomiesDocument } from "@/types/cms";
import { Button, EmptyState } from "@/components/ui";

interface AdminSingletonEditorProps {
  labels: Record<string, string>;
  formLabels: Record<string, string>;
  taxonomies: TaxonomiesDocument;
  schema: AdminEntitySchema;
  title: string;
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

  const hasContent = Object.entries(values).some(([key, value]) => {
    if (key === "id") {
      return false;
    }

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    if (value == null) {
      return false;
    }

    return String(value).trim().length > 0;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-text-primary">{title}</h1>
        <Button onClick={() => setModalOpen(true)}>{labels.edit}</Button>
      </div>

      {loaded && !hasContent && labels.empty ? (
        <EmptyState title={labels.empty} />
      ) : null}

      <AdminEntityModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        schema={schema}
        entityId={schema.singletonId ?? "default"}
        initialValues={values}
        labels={formLabels}
        taxonomies={taxonomies}
        onSaved={load}
      />
    </div>
  );
}
