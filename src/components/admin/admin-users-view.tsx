"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AdvancedFilters,
  Button,
  DataTable,
  EmptyState,
  Modal,
  type AdvancedFilterField,
  type AdvancedFilterValue,
} from "@/components/ui";
import { applyClientFilters } from "@/lib/filters/apply-client-filters";

interface UserRow extends Record<string, unknown> {
  uid: string;
  email: string;
  role: string;
  status: string;
  displayName?: string;
  photoUrl?: string | null;
  phone?: string | null;
}

interface ProfilePayload {
  user: UserRow & Record<string, unknown>;
  profile: Record<string, unknown> | null;
  profileKind: "student" | "company" | null;
}

interface AdminUsersViewProps {
  labels: Record<string, string>;
}

function field(
  labels: Record<string, string>,
  key: string,
  fallback: string,
  value: unknown,
) {
  if (value === null || value === undefined || value === "") return null;
  const display = Array.isArray(value) ? value.filter(Boolean).join(", ") : String(value);
  if (!display) return null;
  return (
    <div key={key} className="space-y-0.5">
      <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
        {labels[key] ?? fallback}
      </dt>
      <dd className="text-sm text-text-primary">{display}</dd>
    </div>
  );
}

export function AdminUsersView({ labels }: AdminUsersViewProps) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [filters, setFilters] = useState<Record<string, AdvancedFilterValue>>({
    search: "",
    role: "",
    status: "",
  });
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [viewAsLoading, setViewAsLoading] = useState(false);

  const load = async () => {
    const response = await fetch("/api/admin/users");
    if (response.ok) {
      const payload = (await response.json()) as { items: UserRow[] };
      setUsers(payload.items);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filterFields = useMemo<AdvancedFilterField[]>(
    () => [
      {
        id: "search",
        type: "search",
        labelKey: "search",
        placeholderKey: "searchPlaceholder",
      },
      {
        id: "role",
        type: "select",
        labelKey: "filterRole",
        allKey: "filterAll",
        options: [
          { value: "student", label: labels.roleStudent ?? "student" },
          { value: "company", label: labels.roleCompany ?? "company" },
          { value: "admin", label: labels.roleAdmin ?? "admin" },
        ],
      },
      {
        id: "status",
        type: "select",
        labelKey: "filterStatus",
        allKey: "filterAll",
        options: [
          { value: "active", label: labels.statusActive ?? "active" },
          { value: "suspended", label: labels.statusSuspended ?? "suspended" },
        ],
      },
    ],
    [labels.roleAdmin, labels.roleCompany, labels.roleStudent, labels.statusActive, labels.statusSuspended],
  );

  const filteredUsers = useMemo(
    () =>
      applyClientFilters(users, {
        search: {
          value: filters.search,
          accessors: [
            (user) => user.email,
            (user) => user.displayName,
            (user) => user.phone,
            (user) => user.role,
            (user) => user.status,
          ],
        },
        equals: [
          { value: filters.role, accessor: (user) => user.role },
          { value: filters.status, accessor: (user) => user.status },
        ],
      }),
    [filters.role, filters.search, filters.status, users],
  );

  const openProfile = async (uid: string) => {
    setProfileOpen(true);
    setProfileLoading(true);
    setProfile(null);
    setProfileError(null);
    const response = await fetch(`/api/admin/users/${encodeURIComponent(uid)}/profile`);
    setProfileLoading(false);
    if (!response.ok) {
      setProfileError(labels.profileLoadError ?? "Could not load profile.");
      return;
    }
    const payload = (await response.json()) as ProfilePayload;
    setProfile(payload);
  };

  const viewAsUser = async (uid: string) => {
    setViewAsLoading(true);
    setActionMessage(null);
    const response = await fetch("/api/admin/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: uid }),
    });
    setViewAsLoading(false);
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setActionMessage(
        labels[payload?.error ?? ""] ??
          labels.viewAsError ??
          payload?.error ??
          "Could not open portal.",
      );
      return;
    }
    const payload = (await response.json()) as { redirectTo?: string };
    window.location.href = payload.redirectTo ?? "/admin/dashboard";
  };

  const runAction = async (userId: string, action: "promote_admin" | "suspend" | "activate") => {
    setActionLoadingId(userId);
    setActionMessage(null);
    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action }),
    });
    setActionLoadingId(null);
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setActionMessage(
        labels[payload?.error ?? ""] ??
          labels.actionError ??
          payload?.error ??
          "Action failed.",
      );
      return;
    }
    setActionMessage(labels.actionSuccess ?? "Saved.");
    await load();
  };

  const columns = [
    { key: "email" as const, header: labels.email ?? "Email", sortable: true },
    { key: "displayName" as const, header: labels.name ?? "Name", sortable: true },
    { key: "role" as const, header: labels.role ?? "Role", sortable: true },
    { key: "status" as const, header: labels.status ?? "Status", sortable: true },
    {
      key: "actions" as const,
      header: labels.actions ?? "Actions",
      className: "whitespace-nowrap",
      render: (row: UserRow) => (
        <div className="inline-flex flex-nowrap items-center gap-1 whitespace-nowrap">
          <Button
            size="xs"
            variant="outline"
            className="!min-h-6 !px-1.5 !py-0.5 !text-[10px]"
            disabled={actionLoadingId === row.uid}
            onClick={() => void openProfile(row.uid)}
          >
            {labels.viewProfile || "View"}
          </Button>
          <Button
            size="xs"
            variant="outline"
            className="!min-h-6 !px-1.5 !py-0.5 !text-[10px]"
            disabled={actionLoadingId === row.uid}
            onClick={() => runAction(row.uid, "promote_admin")}
          >
            {labels.promoteAdmin || "Make admin"}
          </Button>
          <Button
            size="xs"
            variant="ghost"
            className="!min-h-6 !px-1.5 !py-0.5 !text-[10px]"
            disabled={actionLoadingId === row.uid}
            onClick={() => runAction(row.uid, "suspend")}
          >
            {labels.suspend || "Suspend"}
          </Button>
          <Button
            size="xs"
            variant="ghost"
            className="!min-h-6 !px-1.5 !py-0.5 !text-[10px]"
            disabled={actionLoadingId === row.uid}
            onClick={() => runAction(row.uid, "activate")}
          >
            {labels.activate || "Activate"}
          </Button>
        </div>
      ),
    },
  ];

  const user = profile?.user;
  const linked = profile?.profile;
  const kind = profile?.profileKind;
  const displayName =
    (user?.displayName as string | undefined) ||
    (linked?.fullName as string | undefined) ||
    (linked?.name as string | undefined) ||
    (linked?.contactName as string | undefined) ||
    (user?.email as string | undefined) ||
    "";
  const photoUrl =
    (user?.photoUrl as string | null | undefined) ||
    (linked?.photoUrl as string | null | undefined) ||
    null;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        {labels.eyebrow ? (
          <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.8px] text-text-label">
            {labels.eyebrow}
          </p>
        ) : null}
        <h1 className="font-serif text-[1.75rem] text-text-primary md:text-[2rem]">
          {labels.title ?? "Team & users"}
        </h1>
        {labels.subtitle ? (
          <p className="max-w-2xl text-sm text-text-secondary">{labels.subtitle}</p>
        ) : null}
      </header>

      {actionMessage ? (
        <p className="text-sm text-text-secondary" role="status">
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
        data={filteredUsers}
        rowKey={(row) => row.uid}
        emptyState={<EmptyState title={labels.empty ?? "No users yet"} />}
      />

      <Modal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        title={labels.profileTitle ?? "User profile"}
        footer={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {user &&
            (user.role === "student" || user.role === "company") &&
            String(user.status ?? "active") !== "suspended" ? (
              <Button
                size="sm"
                disabled={viewAsLoading}
                onClick={() => void viewAsUser(String(user.uid))}
              >
                {labels.viewAsUser ?? "View as user"}
              </Button>
            ) : null}
            {kind === "student" || kind === "company" ? (
              <Link
                href="/admin/crm"
                className="btn-brand inline-flex min-h-5 items-center whitespace-nowrap px-1.5 py-0.5 text-[10px]"
              >
                {labels.openInCrm ?? "Open in CRM"}
              </Link>
            ) : null}
            <Button size="sm" variant="ghost" onClick={() => setProfileOpen(false)}>
              {labels.close ?? "Close"}
            </Button>
          </div>
        }
      >
        {profileLoading ? (
          <p className="text-sm text-text-secondary">{labels.loading ?? "Loading…"}</p>
        ) : null}
        {profileError ? (
          <p className="text-sm text-text-warning" role="alert">
            {profileError}
          </p>
        ) : null}
        {user && !profileLoading ? (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrl}
                  alt=""
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-lavender text-lg font-semibold text-text-accent">
                  {(displayName || "?").slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate font-medium text-text-primary">{displayName}</p>
                <p className="truncate text-sm text-text-secondary">
                  {String(user.email ?? "")}
                </p>
              </div>
            </div>

            <dl className="grid gap-3 sm:grid-cols-2">
              {field(labels, "role", "Role", user.role)}
              {field(labels, "status", "Status", user.status)}
              {field(
                labels,
                "phone",
                "Phone",
                user.phone ?? linked?.phone ?? linked?.contactPhone,
              )}
              {kind === "student"
                ? [
                    field(labels, "fullName", "Full name", linked?.fullName),
                    field(labels, "university", "University", linked?.university),
                    field(labels, "currentCity", "City", linked?.currentCity),
                    field(labels, "sector", "Sector", linked?.sector),
                    field(labels, "seniority", "Seniority", linked?.seniority),
                    field(labels, "availability", "Availability", linked?.availability),
                    field(labels, "skills", "Skills", linked?.skills),
                  ]
                : null}
              {kind === "company"
                ? [
                    field(
                      labels,
                      "companyName",
                      "Company",
                      linked?.name ?? linked?.companyName,
                    ),
                    field(labels, "contactName", "Contact", linked?.contactName),
                    field(labels, "industry", "Industry", linked?.industry ?? linked?.sector),
                    field(labels, "city", "City", linked?.city ?? linked?.location),
                    field(labels, "website", "Website", linked?.website),
                  ]
                : null}
            </dl>

            {!linked && (user.role === "student" || user.role === "company" || user.role === "employer") ? (
              <p className="text-sm text-text-secondary">
                {labels.noLinkedProfile ?? "No linked profile yet."}
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
