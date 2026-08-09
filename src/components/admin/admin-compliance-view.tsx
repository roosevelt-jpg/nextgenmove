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

export function AdminComplianceView({
  labels,
}: {
  labels: Record<string, string>;
}) {
  const [records, setRecords] = useState<ConsentRecord[]>([]);
  const [piiAccessEvents, setPiiAccessEvents] = useState<PiiAccessEvent[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/compliance?limit=50&piiLimit=50", {
      cache: "no-store",
    });
    if (!res.ok) {
      setMessage(labels.loadError || "Could not load consent records.");
      return;
    }
    const payload = (await res.json()) as {
      records: ConsentRecord[];
      piiAccessEvents?: PiiAccessEvent[];
    };
    setRecords(payload.records ?? []);
    setPiiAccessEvents(payload.piiAccessEvents ?? []);
    setMessage(null);
  }, [labels.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      {message ? (
        <p className="text-sm text-text-warning" role="alert">
          {message}
        </p>
      ) : null}

      <section className="space-y-2">
        <h2 className="font-serif text-xl text-text-primary">
          {labels.consentsTitle}
        </h2>
        {records.length === 0 ? (
          <p className="text-sm text-text-muted">{labels.consentsEmpty}</p>
        ) : (
          <div className="overflow-x-auto rounded-radius border border-border">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-surface-2 font-mono text-[10px] uppercase tracking-wide text-text-label">
                <tr>
                  <th className="px-3 py-2">{labels.colCreated}</th>
                  <th className="px-3 py-2">{labels.colUser}</th>
                  <th className="px-3 py-2">{labels.colSource}</th>
                  <th className="px-3 py-2">{labels.colRequired}</th>
                  <th className="px-3 py-2">{labels.colMarketing}</th>
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
                    <td className="px-3 py-2 font-mono text-xs">
                      {record.userId}
                    </td>
                    <td className="px-3 py-2">{record.source}</td>
                    <td className="px-3 py-2">
                      {record.requiredProcessing ? labels.yes : labels.no}
                    </td>
                    <td className="px-3 py-2">
                      {record.marketing ? labels.yes : labels.no}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-serif text-xl text-text-primary">{labels.piiTitle}</h2>
        {labels.piiSubtitle ? (
          <p className="text-sm text-text-secondary">{labels.piiSubtitle}</p>
        ) : null}
        {piiAccessEvents.length === 0 ? (
          <p className="text-sm text-text-muted">{labels.piiEmpty}</p>
        ) : (
          <div className="overflow-x-auto rounded-radius border border-border">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-surface-2 font-mono text-[10px] uppercase tracking-wide text-text-label">
                <tr>
                  <th className="px-3 py-2">{labels.colCreated}</th>
                  <th className="px-3 py-2">{labels.colActor}</th>
                  <th className="px-3 py-2">{labels.colStudent}</th>
                  <th className="px-3 py-2">{labels.colAction}</th>
                  <th className="px-3 py-2">{labels.colMeta}</th>
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
