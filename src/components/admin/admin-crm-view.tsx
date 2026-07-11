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
  const [leadMode, setLeadMode] = useState(false);
  const [matchCompanyId, setMatchCompanyId] = useState("");
  const [matchStageId, setMatchStageId] = useState("");
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [stages, setStages] = useState<{ id: string; name: string }[]>([]);
  const [messageChannel, setMessageChannel] = useState<"email" | "sms" | "whatsapp">(
    "email",
  );
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [messageSending, setMessageSending] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

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

  useEffect(() => {
    void fetch("/api/admin/crm/companies")
      .then((r) => (r.ok ? r.json() : null))
      .then((payload) => {
        if (!payload?.items) return;
        setCompanies(
          (payload.items as Array<{ id: string; name?: string }>).map((c) => ({
            id: c.id,
            name: c.name || c.id,
          })),
        );
      });
    void fetch("/api/admin/data/pipeline_stages")
      .then((r) => (r.ok ? r.json() : null))
      .then((payload) => {
        if (!payload?.items) return;
        setStages(
          (payload.items as Array<{ id: string; name?: string }>).map((s) => ({
            id: s.id,
            name: s.name || s.id,
          })),
        );
      });
  }, []);

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
    setLeadMode(false);
    setActionMessage(null);
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
    setActionMessage(null);
    if (row.sourceCollection === "companies" && row.sourceId) {
      void openDetail(row.sourceId, "companies");
      return;
    }
    if (row.sourceCollection === "students" && row.sourceId) {
      void openDetail(row.sourceId, "students");
      return;
    }
    setLeadMode(true);
    setSelectedId(row.id);
    setDetail({
      ...row,
      sourceId: row.sourceId ?? row.id,
    });
    setActivity([]);
  };

  const resolveLead = async (action: "approve" | "reject") => {
    if (!detail?.sourceCollection || !detail.sourceId) return;
    setActionMessage(null);
    const needsPromote =
      detail.sourceCollection === "role_interest_submissions" &&
      action === "approve";
    if (needsPromote && (!matchCompanyId || !matchStageId)) {
      setActionMessage(labels.missing_promote_fields ?? "Select company and stage");
      return;
    }
    const response = await fetch(
      `/api/admin/pending-requests/${detail.sourceCollection}/${detail.sourceId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: needsPromote ? "promote" : action,
          metadata: needsPromote
            ? { companyId: matchCompanyId, stageId: matchStageId }
            : undefined,
        }),
      },
    );
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setActionMessage(payload?.error ?? "action_failed");
      return;
    }
    setSelectedId(null);
    setDetail(null);
    setLeadMode(false);
    await loadOverview();
  };

  const createMatch = async () => {
    if (!selectedId || entityTab !== "students" || leadMode) return;
    if (!matchCompanyId || !matchStageId) {
      setActionMessage(labels.missing_promote_fields ?? "Select company and stage");
      return;
    }
    setActionMessage(null);
    const response = await fetch(`/api/admin/crm/students/${selectedId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_match",
        companyId: matchCompanyId,
        stageId: matchStageId,
      }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setActionMessage(payload?.error ?? "create_match_failed");
      return;
    }
    setActionMessage(labels.matchCreated ?? "Match created.");
    await openDetail(selectedId, "students");
  };

  const runAction = async (action: string, extra?: Record<string, unknown>) => {
    if (!selectedId) return;
    setActionMessage(null);

    const response = await fetch(`/api/admin/crm/${entityTab}/${selectedId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });

    if (response.ok) {
      setActionMessage(labels.actionSuccess ?? "Saved.");
      await openDetail(selectedId, entityTab);
      if (tab === "contacts") {
        await loadOverview();
      } else {
        await loadRows(tab);
      }
      return;
    }

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    setActionMessage(
      labels[payload?.error ?? ""] ??
        labels.actionError ??
        payload?.error ??
        "Action failed.",
    );
  };

  const moveDeal = async (companyId: string, dealStage: DealStage) => {
    const response = await fetch(`/api/admin/crm/companies/${companyId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_deal_stage", dealStage }),
    });
    if (!response.ok) {
      setActionMessage(labels.actionError ?? "Could not move deal.");
      return;
    }
    await loadOverview();
  };

  const sendMessage = async () => {
    if (!selectedId || leadMode || !messageBody.trim()) return;
    setMessageSending(true);
    setActionMessage(null);
    const response = await fetch(
      `/api/admin/crm/${entityTab}/${selectedId}/message`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: messageChannel,
          subject: messageSubject.trim() || undefined,
          body: messageBody.trim(),
        }),
      },
    );
    setMessageSending(false);
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setActionMessage(
        labels[payload?.error ?? ""] ??
          labels.messageError ??
          payload?.error ??
          "Could not send message.",
      );
      return;
    }
    setMessageBody("");
    setMessageSubject("");
    setActionMessage(labels.messageSent ?? "Message sent.");
    await openDetail(selectedId, entityTab);
  };

  const formatJoined = (value: unknown) => {
    if (!value) return "—";
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
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
          { key: "email" as const, header: labels.email, sortable: true },
          { key: "phone" as const, header: labels.phone ?? "Phone", sortable: true },
          {
            key: "nationality" as const,
            header: labels.nationality ?? "Nationality",
            sortable: true,
          },
          {
            key: "dateJoined" as const,
            header: labels.dateJoined ?? "Date joined",
            sortable: true,
            render: (row: CrmRow) => formatJoined(row.dateJoined),
          },
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
            {
              key: "contactPhone" as const,
              header: labels.phone ?? "Phone",
              sortable: true,
            },
            {
              key: "nationality" as const,
              header: labels.nationality ?? "Nationality",
              sortable: true,
            },
            {
              key: "dateJoined" as const,
              header: labels.dateJoined ?? "Date joined",
              sortable: true,
              render: (row: CrmRow) =>
                formatJoined(row.dateJoined ?? row.createdAt),
            },
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
            { key: "phone" as const, header: labels.phone ?? "Phone", sortable: true },
            {
              key: "nationality" as const,
              header: labels.nationality ?? "Nationality",
              sortable: true,
            },
            {
              key: "dateJoined" as const,
              header: labels.dateJoined ?? "Date joined",
              sortable: true,
              render: (row: CrmRow) =>
                formatJoined(row.dateJoined ?? row.createdAt),
            },
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
        <h1 className="font-serif text-[clamp(1.5rem,3vw,2.125rem)] text-text-primary">
          {labels.title}
        </h1>
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
          <div className="grid gap-3 grid-cols-1 min-[860px]:grid-cols-2 xl:grid-cols-4">
            {DEAL_STAGES.map((stage) => (
              <div
                key={stage}
                className="rounded-radius border border-border bg-grad-card p-3"
              >
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                  {(labels[`dealStage_${stage}`] ?? stage).toUpperCase()} ·{" "}
                  {deals[stage].length}
                </p>
                <ul className="mt-3 space-y-2">
                  {deals[stage].map((deal) => (
                    <li
                      key={deal.id}
                      className="rounded-radius border border-border bg-grad-card p-3"
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
                            className="min-h-9 rounded-radius-sm bg-grad-rouse px-2.5 py-1.5 text-[11px] uppercase text-on-gradient hover:opacity-90"
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
          setLeadMode(false);
          setActionMessage(null);
        }}
        title={String(detail?.name ?? detail?.fullName ?? labels.detailTitle)}
        className="max-w-2xl"
      >
        {detail ? (
          <div className="space-y-4">
            {actionMessage ? (
              <p className="text-sm text-text-warning" role="status">
                {labels[actionMessage] ?? actionMessage}
              </p>
            ) : null}
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-text-muted">{labels.email}</dt>
                <dd>{String(detail.contactEmail ?? detail.email ?? "")}</dd>
              </div>
              <div>
                <dt className="text-text-muted">{labels.phone ?? "Phone"}</dt>
                <dd>
                  {String(
                    detail.contactPhone ?? detail.phone ?? "",
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-text-muted">
                  {labels.nationality ?? "Nationality"}
                </dt>
                <dd>{String(detail.nationality ?? "—")}</dd>
              </div>
              <div>
                <dt className="text-text-muted">
                  {labels.dateJoined ?? "Date joined"}
                </dt>
                <dd>
                  {formatJoined(detail.dateJoined ?? detail.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-text-muted">{labels.status}</dt>
                <dd>
                  {String(detail.subscriptionStatus ?? detail.status ?? detail.stage ?? "")}
                </dd>
              </div>
              {detail.lastActivity ? (
                <div>
                  <dt className="text-text-muted">{labels.lastActivityColumn}</dt>
                  <dd>{new Date(String(detail.lastActivity)).toLocaleString()}</dd>
                </div>
              ) : null}
              {detail.type ? (
                <div>
                  <dt className="text-text-muted">{labels.typeColumn}</dt>
                  <dd>{String(detail.type)}</dd>
                </div>
              ) : null}
              {entityTab === "companies" && !leadMode ? (
                <div>
                  <dt className="text-text-muted">{labels.plan}</dt>
                  <dd>{String(detail.plan ?? labels.noPlan)}</dd>
                </div>
              ) : null}
              {entityTab === "students" && !leadMode && detail.workExperience ? (
                <div className="sm:col-span-2">
                  <dt className="text-text-muted">
                    {labels.workExperience ?? "Work experience"}
                  </dt>
                  <dd className="whitespace-pre-wrap">
                    {String(detail.workExperience)}
                  </dd>
                </div>
              ) : null}
              {entityTab === "students" &&
              !leadMode &&
              Array.isArray(detail.education) &&
              detail.education.length ? (
                <div className="sm:col-span-2">
                  <dt className="text-text-muted">
                    {labels.education ?? "Education"}
                  </dt>
                  <dd>
                    <ul className="mt-1 space-y-1">
                      {(
                        detail.education as Array<{
                          institution?: string;
                          degree?: string;
                          year?: string;
                        }>
                      ).map((row, i) => (
                        <li key={`edu-d-${i}`}>
                          {[row.institution, row.degree, row.year]
                            .filter(Boolean)
                            .join(" · ")}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ) : null}
            </dl>

            {leadMode ? (
              <div className="space-y-3">
                {detail.sourceCollection === "role_interest_submissions" ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm text-text-secondary">
                      {labels.company ?? "Company"}
                      <select
                        className="mt-1 w-full rounded-radius-sm border border-border bg-bg px-2.5 py-1.5"
                        value={matchCompanyId}
                        onChange={(e) => setMatchCompanyId(e.target.value)}
                      >
                        <option value="">{labels.selectCompany ?? "Select…"}</option>
                        {companies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm text-text-secondary">
                      {labels.stage ?? "Stage"}
                      <select
                        className="mt-1 w-full rounded-radius-sm border border-border bg-bg px-2.5 py-1.5"
                        value={matchStageId}
                        onChange={(e) => setMatchStageId(e.target.value)}
                      >
                        <option value="">{labels.selectStage ?? "Select…"}</option>
                        {stages.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => void resolveLead("approve")}>
                    {detail.sourceCollection === "role_interest_submissions"
                      ? labels.promote ?? "Promote"
                      : labels.approve ?? "Approve"}
                  </Button>
                  <Button variant="outline" onClick={() => void resolveLead("reject")}>
                    {labels.reject ?? "Reject"}
                  </Button>
                </div>
              </div>
            ) : (
              <>
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

            <div className="space-y-2 rounded-radius border border-border p-3">
              <p className="text-sm font-medium text-text-primary">
                {labels.messageTitle ?? "Message"}
              </p>
              <div className="flex flex-wrap gap-2">
                {(["email", "sms", "whatsapp"] as const).map((channel) => (
                  <button
                    key={channel}
                    type="button"
                    onClick={() => setMessageChannel(channel)}
                    className={
                      messageChannel === channel
                        ? "rounded-full bg-fill-accent px-2.5 py-0.5 text-[11px] font-semibold text-on-accent"
                        : "rounded-full bg-surface-2 px-2.5 py-0.5 text-[11px] font-semibold text-text-secondary"
                    }
                  >
                    {labels[`channel_${channel}`] ?? channel}
                  </button>
                ))}
              </div>
              {messageChannel === "email" ? (
                <Input
                  id="crm-message-subject"
                  label={labels.messageSubject ?? "Subject"}
                  value={messageSubject}
                  onChange={(e) => setMessageSubject(e.target.value)}
                />
              ) : null}
              <Textarea
                id="crm-message-body"
                label={labels.messageBody ?? "Message"}
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                rows={3}
              />
              <Button
                size="sm"
                disabled={messageSending || !messageBody.trim()}
                onClick={() => void sendMessage()}
              >
                {labels.sendMessage ?? "Send"}
              </Button>
            </div>

            {entityTab === "students" ? (
              <div className="space-y-2 rounded-radius border border-border p-3">
                <p className="text-sm font-medium text-text-primary">
                  {labels.createMatchTitle ?? "Create match"}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm text-text-secondary">
                    {labels.company ?? "Company"}
                    <select
                      className="mt-1 w-full rounded-radius-sm border border-border bg-bg px-2.5 py-1.5"
                      value={matchCompanyId}
                      onChange={(e) => setMatchCompanyId(e.target.value)}
                    >
                      <option value="">{labels.selectCompany ?? "Select…"}</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm text-text-secondary">
                    {labels.stage ?? "Stage"}
                    <select
                      className="mt-1 w-full rounded-radius-sm border border-border bg-bg px-2.5 py-1.5"
                      value={matchStageId}
                      onChange={(e) => setMatchStageId(e.target.value)}
                    >
                      <option value="">{labels.selectStage ?? "Select…"}</option>
                      {stages.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <Button size="sm" onClick={() => void createMatch()}>
                  {labels.createMatch ?? "Create match"}
                </Button>
              </div>
            ) : null}

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
                        <p className="text-xs text-text-muted">
                          {new Date(entry.createdAt).toLocaleString()}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
              </>
            )}
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
    <div className="rounded-radius border border-border bg-grad-card p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted">
        {label}
      </p>
      <p className="mt-1 font-serif text-2xl text-text-primary">{value}</p>
    </div>
  );
}
