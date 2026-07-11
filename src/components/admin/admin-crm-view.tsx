"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminEntityModal } from "@/components/admin/admin-entity-modal";
import { ENTITY_SCHEMAS } from "@/lib/admin/entity-schemas";
import type { TaxonomiesDocument } from "@/types/cms";
import { Button, DataTable, EmptyState, Input, Modal, Tabs, Textarea } from "@/components/ui";

type CrmTab = "contacts" | "companies" | "students";
type DealStage = "new" | "contacted" | "qualified" | "won";

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
  type?: string;
  stage?: string;
  owner?: string;
  lastActivity?: string | null;
  value?: string;
  sourceId?: string;
  sourceCollection?: string;
}

interface ActivityItem {
  id: string;
  action: string;
  actorId: string;
  createdAt: string | null;
}

interface CrmStats {
  totalContacts: number;
  openDeals: number;
  activeCompanies: number;
  newLeads7d: number;
}

interface AdminCrmViewProps {
  labels: Record<string, string>;
  formLabels: Record<string, string>;
  taxonomies: TaxonomiesDocument;
}

const DEAL_STAGES: DealStage[] = ["new", "contacted", "qualified", "won"];

export function AdminCrmView({ labels, formLabels, taxonomies }: AdminCrmViewProps) {
  const [tab, setTab] = useState<CrmTab>("contacts");
  const [rows, setRows] = useState<CrmRow[]>([]);
  const [contacts, setContacts] = useState<CrmRow[]>([]);
  const [deals, setDeals] = useState<Record<DealStage, CrmRow[]>>({
    new: [],
    contacted: [],
    qualified: [],
    won: [],
  });
  const [stats, setStats] = useState<CrmStats>({
    totalContacts: 0,
    openDeals: 0,
    activeCompanies: 0,
    newLeads7d: 0,
  });
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CrmRow | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [note, setNote] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [entityTab, setEntityTab] = useState<"companies" | "students">("companies");

  const loadOverview = async () => {
    const response = await fetch("/api/admin/crm/overview");
    if (!response.ok) return;
    const payload = (await response.json()) as {
      stats: CrmStats;
      deals: Record<DealStage, CrmRow[]>;
      contacts: CrmRow[];
    };
    setStats(payload.stats);
    setDeals(payload.deals);
    setContacts(payload.contacts);
  };

  const loadRows = async (nextTab: "companies" | "students") => {
    const response = await fetch(`/api/admin/crm/${nextTab}`);
    if (response.ok) {
      const payload = (await response.json()) as { items: CrmRow[] };
      setRows(payload.items);
    }
  };

  useEffect(() => {
    if (tab === "contacts") {
      void loadOverview();
    } else {
      setEntityTab(tab);
      void loadRows(tab);
    }
  }, [tab]);

  const tableRows = tab === "contacts" ? contacts : rows;

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tableRows;

    return tableRows.filter((row) => {
      const haystack = [
        row.name,
        row.fullName,
        row.email,
        row.contactEmail,
        row.plan,
        row.status,
        row.subscriptionStatus,
        row.type,
        row.stage,
        row.owner,
        row.value,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [tableRows, search]);

  const openDetail = async (id: string, collection?: "companies" | "students") => {
    const target = collection ?? entityTab;
    setSelectedId(id);
    setEntityTab(target);
    const response = await fetch(`/api/admin/crm/${target}/${id}`);

    if (response.ok) {
      const payload = (await response.json()) as {
        item: CrmRow;
        activity: ActivityItem[];
      };
      setDetail(payload.item);
      setActivity(payload.activity);
    }
  };

  const openContact = (row: CrmRow) => {
    if (row.sourceCollection === "companies" && row.sourceId) {
      void openDetail(row.sourceId, "companies");
      return;
    }
    if (row.sourceCollection === "students" && row.sourceId) {
      void openDetail(row.sourceId, "students");
    }
  };

  const runAction = async (action: string, extra?: Record<string, unknown>) => {
    if (!selectedId) return;

    const response = await fetch(`/api/admin/crm/${entityTab}/${selectedId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });

    if (response.ok) {
      await openDetail(selectedId, entityTab);
      if (tab === "contacts") {
        await loadOverview();
      } else {
        await loadRows(tab);
      }
    }
  };

  const moveDeal = async (companyId: string, dealStage: DealStage) => {
    await fetch(`/api/admin/crm/companies/${companyId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_deal_stage", dealStage }),
    });
    await loadOverview();
  };

  const columns =
    tab === "contacts"
      ? [
          {
            key: "name" as const,
            header: labels.name,
            sortable: true,
            render: (row: CrmRow) => (
              <button
                type="button"
                className="text-left font-medium text-text-accent hover:underline"
                onClick={() => openContact(row)}
              >
                {String(row.name ?? row.id)}
              </button>
            ),
          },
          { key: "type" as const, header: labels.typeColumn, sortable: true },
          {
            key: "stage" as const,
            header: labels.stageColumn,
            sortable: true,
            render: (row: CrmRow) => {
              const stage = String(row.stage ?? "").toLowerCase();
              const tone =
                stage === "won"
                  ? "bg-bg-success text-text-success"
                  : stage === "qualified"
                    ? "bg-bg-purple text-fill-accent"
                    : stage === "contacted"
                      ? "bg-bg-accent text-text-accent"
                      : "bg-surface-2 text-text-secondary";
              return (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold capitalize ${tone}`}
                >
                  {String(row.stage ?? "—")}
                </span>
              );
            },
          },
          { key: "owner" as const, header: labels.ownerColumn, sortable: true },
          {
            key: "lastActivity" as const,
            header: labels.lastActivityColumn,
            sortable: true,
          },
          { key: "value" as const, header: labels.valueColumn, sortable: true },
        ]
      : tab === "companies"
        ? [
            {
              key: "name" as const,
              header: labels.name,
              sortable: true,
              render: (row: CrmRow) => (
                <button
                  type="button"
                  className="text-left text-text-accent hover:underline"
                  onClick={() => openDetail(row.id, "companies")}
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
                  onClick={() => openDetail(row.id, "students")}
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
      <header className="space-y-2">
        {labels.eyebrow ? (
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-text-accent">
            {labels.eyebrow}
          </p>
        ) : null}
        <h1 className="font-serif text-3xl text-text-primary">{labels.title}</h1>
        {labels.subtitle ? (
          <p className="max-w-2xl text-sm text-text-secondary">{labels.subtitle}</p>
        ) : null}
      </header>

      <Tabs
        activeTabId={tab}
        onTabChange={(nextTab) => setTab(nextTab as CrmTab)}
        tabs={[
          { id: "contacts", label: labels.contactsTab, content: null },
          { id: "companies", label: labels.companiesTab, content: null },
          { id: "students", label: labels.studentsTab, content: null },
        ]}
      />

      {tab === "contacts" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label={labels.statTotalContacts}
              value={String(stats.totalContacts)}
            />
            <StatCard label={labels.statOpenDeals} value={String(stats.openDeals)} />
            <StatCard
              label={labels.statActiveCompanies}
              value={String(stats.activeCompanies)}
            />
            <StatCard label={labels.statNewLeads} value={String(stats.newLeads7d)} />
          </div>

          {labels.dealPipelineTitle ? (
            <h2 className="font-medium text-text-primary">{labels.dealPipelineTitle}</h2>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {DEAL_STAGES.map((stage) => (
              <div
                key={stage}
                className="rounded-radius border border-border bg-surface-2 p-3"
              >
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                  {(labels[`dealStage_${stage}`] ?? stage).toUpperCase()} ·{" "}
                  {deals[stage].length}
                </p>
                <ul className="mt-3 space-y-2">
                  {deals[stage].map((deal) => (
                    <li
                      key={deal.id}
                      className="rounded-radius border border-border bg-surface-1 p-3"
                    >
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => openContact(deal)}
                      >
                        <p className="text-sm font-semibold text-text-primary">
                          {deal.name}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {deal.value}
                        </p>
                      </button>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {DEAL_STAGES.filter((s) => s !== stage).map((next) => (
                          <button
                            key={next}
                            type="button"
                            className="rounded-radius-sm bg-bg px-2 py-0.5 text-[10px] uppercase text-text-muted hover:text-text-primary"
                            onClick={() => void moveDeal(deal.id, next)}
                          >
                            → {labels[`dealStage_${next}`] ?? next}
                          </button>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {labels.contactsTableTitle ? (
            <h2 className="font-medium text-text-primary">{labels.contactsTableTitle}</h2>
          ) : null}
        </>
      ) : null}

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
              {entityTab === "companies" ? (
                <div>
                  <dt className="text-text-muted">{labels.plan}</dt>
                  <dd>{String(detail.plan ?? labels.noPlan)}</dd>
                </div>
              ) : null}
            </dl>

            <div className="flex flex-wrap gap-2">
              {entityTab === "companies" ? (
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
          schema={ENTITY_SCHEMAS[entityTab]!}
          entityId={detail.id}
          initialValues={detail}
          labels={formLabels}
          taxonomies={taxonomies}
          onSaved={() => {
            if (tab === "contacts") {
              void loadOverview();
            } else {
              void loadRows(tab);
            }
            if (selectedId) {
              void openDetail(selectedId, entityTab);
            }
          }}
        />
      ) : null}
    </div>
  );
}

function StatCard({ label, value }: { label?: string; value: string }) {
  if (!label) return null;
  return (
    <div className="rounded-radius border border-border bg-surface-1 p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted">
        {label}
      </p>
      <p className="mt-1 font-serif text-2xl text-text-primary">{value}</p>
    </div>
  );
}
