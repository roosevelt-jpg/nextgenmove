"use client";

import { useEffect, useState } from "react";
import { AdminEntityModal } from "@/components/admin/admin-entity-modal";
import type { AdminEntitySchema } from "@/lib/admin/entity-schemas";
import type { TaxonomiesDocument } from "@/types/cms";
import { Button, DataTable, EmptyState } from "@/components/ui";

interface AdminEntityListViewProps {
  labels: Record<string, string>;
  formLabels: Record<string, string>;
  taxonomies: TaxonomiesDocument;
  schema: AdminEntitySchema;
  title: string;
}

export function AdminEntityListView({
  labels,
  formLabels,
  taxonomies,
  schema,
  title,
}: AdminEntityListViewProps) {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Record<string, unknown> | null>(null);

  const load = async () => {
    const response = await fetch(`/api/admin/data/${schema.collection}`);
    if (response.ok) {
      const payload = (await response.json()) as {
        items?: Record<string, unknown>[];
        item?: Record<string, unknown> | null;
      };
      setItems(payload.items ?? (payload.item ? [payload.item] : []));
    }
  };

  useEffect(() => {
    void load();
  }, [schema.collection]);

  const columns = [
    {
      key: "title" as const,
      header: labels.titleColumn,
      render: (row: Record<string, unknown>) => String(row.title ?? row.name ?? row.id ?? ""),
    },
    {
      key: "status" as const,
      header: labels.statusColumn,
      render: (row: Record<string, unknown>) =>
        String(row.status ?? row.subscriptionStatus ?? ""),
    },
    {
      key: "actions" as const,
      header: labels.actionsColumn,
      render: (row: Record<string, unknown>) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              setEditingItem(row);
              setModalOpen(true);
            }}
          >
            {labels.edit}
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              await fetch(`/api/admin/data/${schema.collection}/${String(row.id)}`, {
                method: "DELETE",
              });
              await load();
            }}
          >
            {labels.delete}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[14.5px] font-bold text-text-primary">{title}</h2>
        <Button
          size="sm"
          onClick={() => {
            setEditingItem(null);
            setModalOpen(true);
          }}
        >
          {labels.create}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={items}
        rowKey={(row) => String(row.id)}
        emptyState={<EmptyState title={labels.empty} />}
      />

      <AdminEntityModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        schema={schema}
        entityId={editingItem ? String(editingItem.id) : null}
        initialValues={editingItem ?? {}}
        labels={formLabels}
        taxonomies={taxonomies}
        onSaved={load}
      />
    </div>
  );
}
