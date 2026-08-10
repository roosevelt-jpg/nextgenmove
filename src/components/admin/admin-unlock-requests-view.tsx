"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AdvancedFilters,
  Button,
  type AdvancedFilterField,
  type AdvancedFilterValue,
} from "@/components/ui";
import { applyClientFilters, uniqueOptionValues } from "@/lib/filters/apply-client-filters";

export interface UnlockRequestItem {
  id: string;
  type?: string;
  companyId: string;
  studentId: string;
  matchId?: string | null;
  status: string;
  note?: string | null;
  createdAt?: string | null;
  resolvedAt?: string | null;
  companyName?: string;
  employerLabel?: string | null;
  candidateLabel?: string;
  studentFullName?: string;
}

interface AdminUnlockRequestsViewProps {
  labels: Record<string, string>;
}

function statusLabel(status: string, labels: Record<string, string>) {
  switch (status) {
    case "approved":
      return labels.statusApproved || "Approved";
    case "declined":
      return labels.statusDeclined || "Declined";
    default:
      return labels.statusPending || "Pending";
  }
}

export function AdminUnlockRequestsView({ labels }: AdminUnlockRequestsViewProps) {
  const [items, setItems] = useState<UnlockRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, AdvancedFilterValue>>({
    search: "",
    status: "",
    type: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setErrorCode(null);
    try {
      const response = await fetch("/api/admin/unlock-requests", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("load_failed");
      const payload = (await response.json()) as { items?: UnlockRequestItem[] };
      setItems(payload.items ?? []);
    } catch {
      setErrorCode("load_failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (id: string, action: "approve" | "decline") => {
    setBusyId(id);
    setErrorCode(null);
    try {
      const response = await fetch(`/api/admin/unlock-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) {
        setErrorCode("update_failed");
        return;
      }
      await load();
    } catch {
      setErrorCode("update_failed");
    } finally {
      setBusyId(null);
    }
  };

  const statusOptions = useMemo(
    () => uniqueOptionValues(items.map((i) => i.status)),
    [items],
  );

  const typeOptions = useMemo(() => {
    const raw = uniqueOptionValues(
      items.map((i) => i.type || "profile_unlock"),
    );
    return raw.map((opt) => ({
      value: opt.value,
      label:
        opt.value === "company_unlock"
          ? labels.typeCompanyUnlock || "Company unlock"
          : labels.typeProfileUnlock || "Profile unlock",
    }));
  }, [items, labels.typeCompanyUnlock, labels.typeProfileUnlock]);

  const filterFields = useMemo<AdvancedFilterField[]>(
    () => [
      {
        id: "search",
        type: "search",
        labelKey: "search",
        placeholderKey: "searchPlaceholder",
      },
      {
        id: "type",
        type: "select",
        labelKey: "filterType",
        allKey: "filterAll",
        options: typeOptions,
      },
      {
        id: "status",
        type: "select",
        labelKey: "filterStatus",
        allKey: "filterAll",
        options: statusOptions,
      },
    ],
    [statusOptions, typeOptions],
  );

  const filteredItems = useMemo(
    () =>
      applyClientFilters(items, {
        search: {
          value: filters.search,
          accessors: [
            (row) => row.companyName,
            (row) => row.employerLabel,
            (row) => row.companyId,
            (row) => row.candidateLabel,
            (row) => row.studentFullName,
            (row) => row.studentId,
            (row) => row.type,
          ],
        },
        equals: [
          { value: filters.status, accessor: (row) => row.status },
          {
            value: filters.type,
            accessor: (row) => row.type || "profile_unlock",
          },
        ],
      }),
    [items, filters],
  );

  if (loading) {
    return (
      <p className="text-sm text-text-muted">{labels.loading || "Loading…"}</p>
    );
  }

  return (
    <div className="space-y-4">
      {errorCode ? (
        <p className="text-sm text-text-warning" role="alert">
          {labels[errorCode] || labels.genericError || "Something went wrong."}
        </p>
      ) : null}

      <AdvancedFilters
        labels={{
          ...labels,
          search: labels.search || "Search",
          searchPlaceholder: labels.searchPlaceholder || "Search requests…",
          filterStatus: labels.filterStatus || "Status",
          filterType: labels.filterType || "Type",
          filterAll: labels.filterAll || "All",
          clearFilters: labels.clearFilters || "Clear filters",
        }}
        fields={filterFields}
        values={filters}
        onChange={setFilters}
        clearKey="clearFilters"
      />

      {!filteredItems.length ? (
        <p className="text-sm text-text-secondary">
          {labels.empty || "No unlock requests yet."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-radius border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-2 font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted">
              <tr>
                <th className="px-3 py-2.5">{labels.colType || "Type"}</th>
                <th className="px-3 py-2.5">{labels.colCompany || "Company"}</th>
                <th className="px-3 py-2.5">{labels.colCandidate || "Candidate"}</th>
                <th className="px-3 py-2.5">{labels.colRequested || "Requested"}</th>
                <th className="px-3 py-2.5">{labels.colStatus || "Status"}</th>
                <th className="px-3 py-2.5">{labels.colActions || "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-3 align-top">
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs text-text-secondary">
                      {(item.type || "profile_unlock") === "company_unlock"
                        ? labels.typeCompanyUnlock || "Company unlock"
                        : labels.typeProfileUnlock || "Profile unlock"}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <p className="font-medium text-text-primary">
                      {item.type === "company_unlock"
                        ? item.employerLabel || item.companyName || item.companyId
                        : item.companyName || item.companyId}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-text-muted">
                      {item.companyId}
                    </p>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <p className="font-medium text-text-primary">
                      {item.candidateLabel}
                    </p>
                    {item.studentFullName ? (
                      <p className="mt-0.5 text-xs text-text-secondary">
                        {item.studentFullName}
                      </p>
                    ) : null}
                    <p className="mt-0.5 font-mono text-[10px] text-text-muted">
                      {item.studentId}
                    </p>
                  </td>
                  <td className="px-3 py-3 align-top text-text-secondary">
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs text-text-secondary">
                      {statusLabel(item.status, labels)}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-top">
                    {item.status === "pending" ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          disabled={busyId === item.id}
                          onClick={() => void act(item.id, "approve")}
                        >
                          {labels.approve || "Approve"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === item.id}
                          onClick={() => void act(item.id, "decline")}
                        >
                          {labels.decline || "Decline"}
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-text-muted">
                        {item.resolvedAt
                          ? new Date(item.resolvedAt).toLocaleString()
                          : "—"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
