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
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action }),
    });
    setActionLoadingId(null);
    await load();
  };

  const columns = [
    { key: "email" as const, header: labels.email, sortable: true },
    { key: "displayName" as const, header: labels.name, sortable: true },
    { key: "role" as const, header: labels.role, sortable: true },
    { key: "status" as const, header: labels.status, sortable: true },
    {
      key: "actions" as const,
      header: labels.actions,
      render: (row: UserRow) => (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={actionLoadingId === row.uid}
            onClick={() => runAction(row.uid, "promote_admin")}
          >
            {labels.promoteAdmin}
          </Button>
          <Button
            variant="ghost"
            disabled={actionLoadingId === row.uid}
            onClick={() => runAction(row.uid, "suspend")}
          >
            {labels.suspend}
          </Button>
          <Button
            variant="ghost"
            disabled={actionLoadingId === row.uid}
            onClick={() => runAction(row.uid, "activate")}
          >
            {labels.activate}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl text-text-primary">{labels.title}</h1>
      </header>

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
        emptyState={<EmptyState title={labels.empty} />}
      />
    </div>
  );
}
