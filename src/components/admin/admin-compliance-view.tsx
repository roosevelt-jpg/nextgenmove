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

export function AdminComplianceView() {
  const [records, setRecords] = useState<ConsentRecord[]>([]);
  const [anonymizeLibPath, setAnonymizeLibPath] = useState(
    "src/lib/security/anonymize-account.ts",
  );
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/compliance?limit=50", {
      cache: "no-store",
    });
    if (!res.ok) {
      setMessage("Could not load consent records.");
      return;
    }
    const payload = (await res.json()) as {
      records: ConsentRecord[];
      anonymizeLibPath?: string;
    };
    setRecords(payload.records ?? []);
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
    </div>
  );
}
