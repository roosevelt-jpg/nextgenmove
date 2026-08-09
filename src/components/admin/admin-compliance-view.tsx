"use client";

import { useCallback, useEffect, useState } from "react";

type ConsentRecord = {
  id: string;
  userId: string;
  source: string;
  requiredProcessing: boolean;
  marketing: boolean;
  createdAt: string | null;
};

type PiiAccessEvent = {
  id: string;
  actorUid: string;
  studentId: string;
  action: string;
  meta: Record<string, unknown> | null;
  createdAt: string | null;
};

export function AdminComplianceView() {
  const [records, setRecords] = useState<ConsentRecord[]>([]);
  const [piiAccessEvents, setPiiAccessEvents] = useState<PiiAccessEvent[]>([]);
  const [anonymizeLibPath, setAnonymizeLibPath] = useState(
    "src/lib/security/anonymize-account.ts",
  );
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/compliance?limit=50&piiLimit=50", {
      cache: "no-store",
    });
    if (!res.ok) {
      setMessage("Could not load consent records.");
      return;
    }
    const payload = (await res.json()) as {
      records: ConsentRecord[];
      piiAccessEvents?: PiiAccessEvent[];
      anonymizeLibPath?: string;
    };
    setRecords(payload.records ?? []);
    setPiiAccessEvents(payload.piiAccessEvents ?? []);
    if (payload.anonymizeLibPath) {
      setAnonymizeLibPath(payload.anonymizeLibPath);
    }
    setMessage(null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-text-label">
          Compliance locker
        </p>
        <h1 className="font-serif text-3xl text-text-primary">Consent & DSAR</h1>
        <p className="max-w-2xl text-sm text-text-secondary">
          Recent consent records (Admin SDK). Student and employer settings expose
          self-serve JSON exports; deactivation runs through{" "}
          <code className="font-mono text-xs">{anonymizeLibPath}</code>.
        </p>
        <p className="text-sm text-text-secondary">
          Anonymize docs:{" "}
          <span className="font-mono text-xs">docs/security-model.md</span>
          {" · "}
          helper{" "}
          <span className="font-mono text-xs">{anonymizeLibPath}</span>
        </p>
      </header>

      {message ? (
        <p className="text-sm text-text-warning" role="alert">
          {message}
        </p>
      ) : null}

      <section className="space-y-2">
        <h2 className="font-serif text-xl text-text-primary">
          Recent consent records
        </h2>
        {records.length === 0 ? (
          <p className="text-sm text-text-muted">No consent records found.</p>
        ) : (
          <div className="overflow-x-auto rounded-radius border border-border">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-surface-2 font-mono text-[10px] uppercase tracking-wide text-text-label">
                <tr>
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">Required</th>
                  <th className="px-3 py-2">Marketing</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-xs text-text-muted">
                      {record.createdAt
                        ? new Date(record.createdAt).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{record.userId}</td>
                    <td className="px-3 py-2">{record.source}</td>
                    <td className="px-3 py-2">
                      {record.requiredProcessing ? "yes" : "no"}
                    </td>
                    <td className="px-3 py-2">
                      {record.marketing ? "yes" : "no"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-serif text-xl text-text-primary">
          PII access audit
        </h2>
        <p className="text-sm text-text-secondary">
          Recent unlock / view events from{" "}
          <code className="font-mono text-xs">pii_access_events</code> (limit
          50).
        </p>
        {piiAccessEvents.length === 0 ? (
          <p className="text-sm text-text-muted">No PII access events found.</p>
        ) : (
          <div className="overflow-x-auto rounded-radius border border-border">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-surface-2 font-mono text-[10px] uppercase tracking-wide text-text-label">
                <tr>
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2">Actor</th>
                  <th className="px-3 py-2">Student</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Meta</th>
                </tr>
              </thead>
              <tbody>
                {piiAccessEvents.map((event) => (
                  <tr key={event.id} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-xs text-text-muted">
                      {event.createdAt
                        ? new Date(event.createdAt).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {event.actorUid}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {event.studentId}
                    </td>
                    <td className="px-3 py-2">{event.action}</td>
                    <td className="px-3 py-2 font-mono text-[10px] text-text-muted">
                      {event.meta
                        ? [
                            event.meta.matchId
                              ? `match=${String(event.meta.matchId)}`
                              : null,
                            event.meta.companyId
                              ? `company=${String(event.meta.companyId)}`
                              : null,
                            event.meta.requestId
                              ? `req=${String(event.meta.requestId)}`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "—"
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
