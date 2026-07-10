"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminEntityModal } from "@/components/admin/admin-entity-modal";
import { ENTITY_SCHEMAS } from "@/lib/admin/entity-schemas";
import type { TaxonomiesDocument } from "@/types/cms";
import { Button, DataTable, EmptyState, Input, Modal, Tabs, Textarea } from "@/components/ui";

type CrmTab = "companies" | "students";

interface CrmRow extends Record<string, unknown> {
  id: string;
  name?: string;
  fullName?: string;
  email?: string;
  contactEmail?: string;
  plan?: string | null;
  subscriptionStatus?: string;
  status?: string;
  sector?: string;
}

interface ActivityItem {
  id: string;
  action: string;
  actorId: string;
  createdAt: string | null;
}

interface AdminCrmViewProps {
  labels: Record<string, string>;
  formLabels: Record<string, string>;
  taxonomies: TaxonomiesDocument;
}

export function AdminCrmView({ labels, formLabels, taxonomies }: AdminCrmViewProps) {
  const [tab, setTab] = useState<CrmTab>("companies");
  const [rows, setRows] = useState<CrmRow[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CrmRow | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [note, setNote] = useState("");
  const [editOpen, setEditOpen] = useState(false);

  const loadRows = async (nextTab: CrmTab) => {
    const response = await fetch(`/api/admin/crm/${nextTab}`);
    if (response.ok) {
      const payload = (await response.json()) as { items: CrmRow[] };
      setRows(payload.items);
    }
  };

  useEffect(() => {
    void loadRows(tab);
  }, [tab]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return rows;
    }

    return rows.filter((row) => {
      const haystack = [
        row.name,
        row.fullName,
        row.email,
        row.contactEmail,
        row.plan,
        row.status,
        row.subscriptionStatus,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [rows, search]);

  const openDetail = async (id: string) => {
    setSelectedId(id);
    const response = await fetch(`/api/admin/crm/${tab}/${id}`);

    if (response.ok) {
      const payload = (await response.json()) as {
        item: CrmRow;
        activity: ActivityItem[];
      };
      setDetail(payload.item);
      setActivity(payload.activity);
    }
  };

  const runAction = async (action: string, extra?: Record<string, unknown>) => {
    if (!selectedId) {
      return;
    }

    const response = await fetch(`/api/admin/crm/${tab}/${selectedId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });

    if (response.ok) {
      await openDetail(selectedId);
      await loadRows(tab);
    }
  };

  const columns =
    tab === "companies"
      ? [
          {
            key: "name" as const,
            header: labels.name,
            sortable: true,
            render: (row: CrmRow) => (
              <button
                type="button"
                className="text-left text-text-accent hover:underline"
                onClick={() => openDetail(row.id)}
              >
                {String(row.name ?? row.id)}
              </button>
            ),
          },
          { key: "contactEmail" as const, header: labels.email, sortable: true },
          { key: "plan" as const, header: labels.plan, sortable: true },
          {
            key: "subscriptionStatus" as const,
            header: labels.status,
            sortable: true,
          },
        ]
      : [
          {
            key: "fullName" as const,
            header: labels.name,
            sortable: true,
            render: (row: CrmRow) => (
              <button
                type="button"
                className="text-left text-text-accent hover:underline"
                onClick={() => openDetail(row.id)}
              >
                {String(row.fullName ?? row.id)}
              </button>
            ),
          },
          { key: "email" as const, header: labels.email, sortable: true },
          { key: "sector" as const, header: labels.sector, sortable: true },
          { key: "status" as const, header: labels.status, sortable: true },
        ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl text-text-primary">{labels.title}</h1>
      </header>

      <Tabs
        activeTabId={tab}
        onTabChange={(nextTab) => setTab(nextTab as CrmTab)}
        tabs={[
          { id: "companies", label: labels.companiesTab, content: null },
          { id: "students", label: labels.studentsTab, content: null },
        ]}
      />

      <Input
        id="crm-search"
        label={labels.search}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      <DataTable
        columns={columns}
        data={filteredRows}
        rowKey={(row) => row.id}
        emptyState={<EmptyState title={labels.empty} />}
      />

      <Modal
        open={Boolean(selectedId && detail)}
        onClose={() => {
          setSelectedId(null);
          setDetail(null);
          setActivity([]);
          setNote("");
        }}
        title={String(detail?.name ?? detail?.fullName ?? labels.detailTitle)}
        className="max-w-2xl"
      >
        {detail ? (
          <div className="space-y-4">
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-text-muted">{labels.email}</dt>
                <dd>{String(detail.contactEmail ?? detail.email ?? "")}</dd>
              </div>
              <div>
                <dt className="text-text-muted">{labels.status}</dt>
                <dd>{String(detail.subscriptionStatus ?? detail.status ?? "")}</dd>
              </div>
              {tab === "companies" ? (
                <div>
                  <dt className="text-text-muted">{labels.plan}</dt>
                  <dd>{String(detail.plan ?? labels.noPlan)}</dd>
                </div>
              ) : null}
            </dl>

            <div className="flex flex-wrap gap-2">
              {tab === "companies" ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => runAction("change_plan", { plan: "track_a" })}
                  >
                    {labels.planTrackA}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => runAction("change_plan", { plan: "track_b" })}
                  >
                    {labels.planTrackB}
                  </Button>
                </>
              ) : null}
              <Button variant="outline" onClick={() => runAction("suspend")}>
                {labels.suspend}
              </Button>
              <Button variant="ghost" onClick={() => runAction("activate")}>
                {labels.activate}
              </Button>
              <Button variant="ghost" onClick={() => setEditOpen(true)}>
                {labels.edit}
              </Button>
            </div>

            <div>
              <Textarea
                id="crm-note"
                label={labels.addNote}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
              <Button
                className="mt-2"
                variant="outline"
                onClick={() => {
                  void runAction("add_note", { note });
                  setNote("");
                }}
              >
                {labels.saveNote}
              </Button>
            </div>

            <div>
              <h3 className="mb-2 font-medium text-text-primary">{labels.activityTitle}</h3>
              {activity.length === 0 ? (
                <EmptyState title={labels.activityEmpty} />
              ) : (
                <ul className="divide-y divide-border text-sm">
                  {activity.map((entry) => (
                    <li key={entry.id} className="py-2">
                      <p>{entry.action}</p>
                      {entry.createdAt ? (
                        <p className="text-xs text-text-muted">{entry.createdAt}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      {editOpen && detail ? (
        <AdminEntityModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          schema={ENTITY_SCHEMAS[tab]!}
          entityId={detail.id}
          initialValues={detail}
          labels={formLabels}
          taxonomies={taxonomies}
          onSaved={() => {
            void loadRows(tab);
            if (selectedId) {
              void openDetail(selectedId);
            }
          }}
        />
      ) : null}
    </div>
  );
}
