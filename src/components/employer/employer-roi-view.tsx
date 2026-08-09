"use client";

import { useCallback, useEffect, useState } from "react";

type RoiPayload = {
  hireCount: number;
  avgDaysToHire: number | null;
  avgDaysToHireSampleSize: number;
  dualCommit: { locked: number; released: number };
  shadowSprints: {
    go: number;
    noGo: number;
    finalCount: number;
    goRate: number | null;
    noGoRate: number | null;
  };
  benchReservations: {
    total: number;
    converted: number;
    convertRate: number | null;
  };
};

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-radius border border-border px-3 py-3">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-label">
        {label}
      </p>
      <p className="mt-1 font-serif text-3xl text-fill-accent">{value}</p>
      {hint ? <p className="mt-1 text-xs text-text-muted">{hint}</p> : null}
    </div>
  );
}

export function EmployerRoiView() {
  const [data, setData] = useState<RoiPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/employer/roi", { cache: "no-store" });
    if (!res.ok) {
      setError("Could not load ROI metrics.");
      return;
    }
    setError(null);
    setData((await res.json()) as RoiPayload);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-2">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-text-label">
          ROI Room
        </p>
        <h1 className="font-serif text-3xl text-text-primary">
          Live hiring economics
        </h1>
        <p className="text-sm text-text-secondary">
          Aggregated from your matches, dual-commit escrows, shadow sprints, and
          bench holds — no demo numbers.
        </p>
      </header>

      {error ? <p className="text-sm text-text-warning">{error}</p> : null}

      {!data ? (
        <p className="text-sm text-text-muted">Loading live metrics…</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Stat label="Hires" value={String(data.hireCount)} />
          <Stat
            label="Avg days to hire"
            value={
              data.avgDaysToHire == null ? "—" : String(data.avgDaysToHire)
            }
            hint={
              data.avgDaysToHireSampleSize > 0
                ? `Based on ${data.avgDaysToHireSampleSize} timed hire(s)`
                : "Needs createdAt + hiredAt/updatedAt on hires"
            }
          />
          <Stat
            label="Dual-commit locked"
            value={String(data.dualCommit.locked)}
          />
          <Stat
            label="Dual-commit released"
            value={String(data.dualCommit.released)}
          />
          <Stat
            label="Sprint GO rate"
            value={
              data.shadowSprints.goRate == null
                ? "—"
                : `${data.shadowSprints.goRate}%`
            }
            hint={`${data.shadowSprints.go} GO · ${data.shadowSprints.noGo} NO-GO`}
          />
          <Stat
            label="Bench convert rate"
            value={
              data.benchReservations.convertRate == null
                ? "—"
                : `${data.benchReservations.convertRate}%`
            }
            hint={`${data.benchReservations.converted} of ${data.benchReservations.total} reservations`}
          />
        </div>
      )}
    </div>
  );
}
