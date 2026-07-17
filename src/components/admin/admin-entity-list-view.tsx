"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminEntityModal } from "@/components/admin/admin-entity-modal";
import type { AdminEntitySchema } from "@/lib/admin/entity-schemas";
import type { TaxonomiesDocument } from "@/types/cms";
import {
  AdvancedFilters,
  Button,
  DataTable,
  EmptyState,
  type AdvancedFilterField,
  type AdvancedFilterValue,
} from "@/components/ui";
import {
  applyClientFilters,
  uniqueOptionValues,
} from "@/lib/filters/apply-client-filters";

interface AdminEntityListViewProps {
  labels: Record<string, string>;
  formLabels: Record<string, string>;
  taxonomies: TaxonomiesDocument;
  schema: AdminEntitySchema;
  title: string;
}

const FACET_KEYS = ["category", "sector", "department", "type"] as const;

export function AdminEntityListView({
  labels,
  formLabels,
  taxonomies,
  schema,
  title,
}: AdminEntityListViewProps) {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [filters, setFilters] = useState<Record<string, AdvancedFilterValue>>({
    search: "",
    status: "",
    category: "",
    sector: "",
    department: "",
    type: "",
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Record<string, unknown> | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

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

  const schemaKeys = useMemo(
    () => new Set(schema.fields.map((field) => field.key)),
    [schema.fields],
  );

  const filterFields = useMemo<AdvancedFilterField[]>(() => {
    const fields: AdvancedFilterField[] = [
      {
        id: "search",
        type: "search",
        labelKey: "search",
        placeholderKey: "searchPlaceholder",
      },
      {
        id: "status",
        type: "select",
        labelKey: "filterStatus",
        allKey: "filterAll",
        options: uniqueOptionValues(
          items.map((item) =>
            String(item.status ?? item.subscriptionStatus ?? ""),
          ),
        ),
      },
    ];

    for (const key of FACET_KEYS) {
      if (!schemaKeys.has(key)) continue;
      const taxonomy =
        key === "category"
          ? taxonomies.category
          : key === "sector"
            ? taxonomies.sector
            : undefined;
      fields.push({
        id: key,
        type: "select",
        labelKey: `filter${key.charAt(0).toUpperCase()}${key.slice(1)}`,
        allKey: "filterAll",
        options: taxonomy?.length
          ? taxonomy.map((option) => ({
              value: option.value,
              label: option.label,
            }))
          : uniqueOptionValues(items.map((item) => String(item[key] ?? ""))),
      });
    }

    return fields;
  }, [items, schemaKeys, taxonomies.category, taxonomies.sector]);

  const filteredItems = useMemo(
    () =>
      applyClientFilters(items, {
        search: {
          value: filters.search,
          accessors: [
            (item) => item.title,
            (item) => item.name,
            (item) => item.id,
            (item) => item.status,
            (item) => item.category,
            (item) => item.sector,
            (item) => item.department,
            (item) => item.type,
          ],
        },
        equals: [
          {
            value: filters.status,
            accessor: (item) => item.status ?? item.subscriptionStatus,
          },
          { value: filters.category, accessor: (item) => item.category },
          { value: filters.sector, accessor: (item) => item.sector },
          { value: filters.department, accessor: (item) => item.department },
          { value: filters.type, accessor: (item) => item.type },
        ],
      }),
    [filters, items],
  );

  const columns = [
    {
      key: "title" as const,
      header: labels.titleColumn,
      render: (row: Record<string, unknown>) => String(row.title ?? row.name ?? row.id ?? ""),
    },
    ...(schema.collection === "job_postings"
      ? [
          {
            key: "companyName" as const,
            header: labels.companyName || labels.colCompany || "Company",
            render: (row: Record<string, unknown>) => String(row.companyName ?? ""),
          },
        ]
      : []),
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
        <div className="flex flex-nowrap items-center gap-1">
          {schema.collection === "job_postings" &&
          String(row.status ?? "") === "pending" ? (
            <>
              <Button
                size="xs"
                onClick={async () => {
                  setActionMessage(null);
                  const response = await fetch(
                    `/api/admin/data/${schema.collection}/${String(row.id)}`,
                    {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        status: "open",
                        moderationStatus: "approved",
                      }),
                    },
                  );
                  if (!response.ok) {
                    setActionMessage(labels.deleteError ?? "Could not approve.");
                    return;
                  }
                  await load();
                }}
              >
                {labels.approveJobAction || labels.approve || "Approve"}
              </Button>
              <Button
                size="xs"
                variant="outline"
                onClick={async () => {
                  setActionMessage(null);
                  const response = await fetch(
                    `/api/admin/data/${schema.collection}/${String(row.id)}`,
                    {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        status: "rejected",
                        moderationStatus: "rejected",
                      }),
                    },
                  );
                  if (!response.ok) {
                    setActionMessage(labels.deleteError ?? "Could not reject.");
                    return;
                  }
                  await load();
                }}
              >
                {labels.rejectJobAction || labels.reject || "Reject"}
              </Button>
            </>
          ) : null}
          <Button
            size="xs"
            variant="ghost"
            onClick={() => {
              setEditingItem(row);
              setModalOpen(true);
            }}
          >
            {labels.edit}
          </Button>
          <Button
            size="xs"
            variant="outline"
            onClick={async () => {
              setActionMessage(null);
              const response = await fetch(
                `/api/admin/data/${schema.collection}/${String(row.id)}`,
                { method: "DELETE" },
              );
              if (!response.ok) {
                setActionMessage(labels.deleteError ?? "Could not delete.");
                return;
              }
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

      {actionMessage ? (
        <p className="text-sm text-text-warning" role="status">
          {actionMessage}
        </p>
      ) : null}

      <AdvancedFilters
        labels={labels}
        fields={filterFields}
        values={filters}
        onChange={setFilters}
        clearKey="clearFilters"
      />

      <DataTable
        columns={columns}
        data={filteredItems}
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
