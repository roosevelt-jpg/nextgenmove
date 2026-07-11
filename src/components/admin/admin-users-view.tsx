"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, DataTable, EmptyState, Input } from "@/components/ui";

interface UserRow extends Record<string, unknown> {
  uid: string;
  email: string;
  role: string;
  status: string;
  displayName?: string;
}

interface AdminUsersViewProps {
  labels: Record<string, string>;
}

export function AdminUsersView({ labels }: AdminUsersViewProps) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

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

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return users;
    }

    return users.filter((user) =>
      [user.email, user.displayName, user.role, user.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [search, users]);

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
      render: (row: UserRow) => (
        <div className="flex flex-nowrap items-center gap-1">
          <Button
            size="xs"
            variant="outline"
            disabled={actionLoadingId === row.uid}
            onClick={() => runAction(row.uid, "promote_admin")}
          >
            {labels.promoteAdmin ?? "Make admin"}
          </Button>
          <Button
            size="xs"
            variant="ghost"
            disabled={actionLoadingId === row.uid}
            onClick={() => runAction(row.uid, "suspend")}
          >
            {labels.suspend ?? "Suspend"}
          </Button>
          <Button
            size="xs"
            variant="ghost"
            disabled={actionLoadingId === row.uid}
            onClick={() => runAction(row.uid, "activate")}
          >
            {labels.activate ?? "Activate"}
          </Button>
        </div>
      ),
      className: "w-[1%] whitespace-nowrap",
    },
  ];

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

      <Input
        id="users-search"
        label={labels.search}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      <DataTable
        columns={columns}
        data={filteredUsers}
        rowKey={(row) => row.uid}
        emptyState={<EmptyState title={labels.empty ?? "No users yet"} />}
      />
    </div>
  );
}
