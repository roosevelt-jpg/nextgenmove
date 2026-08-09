"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Input, Textarea } from "@/components/ui";
import type { MoveOsLevers, StudentReadiness } from "@/types/move-os";

function fileUrl(item: Record<string, unknown>): string | null {
  const file = item.file as { url?: string } | undefined;
  if (file?.url) return String(file.url);
  if (typeof item.url === "string") return item.url;
  return null;
}

function toIsoFromDatetimeLocal(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const ms = Date.parse(trimmed);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

type EscrowOutcome =
  | "release"
  | "refund_both"
  | "forfeit_student"
  | "forfeit_company";

export function AdminMoveOsView() {
  const [pendingEvidence, setPendingEvidence] = useState<
    Array<Record<string, unknown>>
  >([]);
  const [readyBench, setReadyBench] = useState<Array<Record<string, unknown>>>(
    [],
  );
  const [activeMoves, setActiveMoves] = useState<Array<Record<string, unknown>>>(
    [],
  );
  const [lockedEscrows, setLockedEscrows] = useState<
    Array<Record<string, unknown>>
  >([]);
  const [slaBreachedMoves, setSlaBreachedMoves] = useState<
    Array<Record<string, unknown>>
  >([]);
  const [heldReservations, setHeldReservations] = useState<
    Array<Record<string, unknown>>
  >([]);
  const [levers, setLevers] = useState<MoveOsLevers | null>(null);
  const [grantCompanyId, setGrantCompanyId] = useState("");
  const [grantAmount, setGrantAmount] = useState(100);
  const [studentLookupId, setStudentLookupId] = useState("");
  const [studentReadiness, setStudentReadiness] =
    useState<StudentReadiness | null>(null);
  const [studentSuperseded, setStudentSuperseded] = useState<
    Array<{ kind: string; count: number; labels: string[] }>
  >([]);
  const [evidenceNotes, setEvidenceNotes] = useState<Record<string, string>>(
    {},
  );
  const [evidenceExpiresAt, setEvidenceExpiresAt] = useState<
    Record<string, string>
  >({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/move-os", { cache: "no-store" });
    if (!res.ok) return;
    const payload = (await res.json()) as {
      pendingEvidence: Array<Record<string, unknown>>;
      readyBench: Array<Record<string, unknown>>;
      activeMoves: Array<Record<string, unknown>>;
      lockedEscrows: Array<Record<string, unknown>>;
      slaBreachedMoves: Array<Record<string, unknown>>;
      heldReservations: Array<Record<string, unknown>>;
      levers: MoveOsLevers;
    };
    setPendingEvidence(payload.pendingEvidence ?? []);
    setReadyBench(payload.readyBench ?? []);
    setActiveMoves(payload.activeMoves ?? []);
    setLockedEscrows(payload.lockedEscrows ?? []);
    setSlaBreachedMoves(payload.slaBreachedMoves ?? []);
    setHeldReservations(payload.heldReservations ?? []);
    setLevers(payload.levers ?? null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const readinessBreakdown = useMemo(() => {
    if (!studentReadiness || !levers?.evidenceKindWeights) return null;
    const weights = levers.evidenceKindWeights;
    const verified = studentReadiness.verifiedKinds.map((kind) => ({
      kind,
      weight: Number(weights[kind] ?? 0),
      status: "verified" as const,
    }));
    const missing = studentReadiness.missingKinds.map((kind) => ({
      kind,
      weight: Number(weights[kind] ?? 0),
      status: "missing" as const,
    }));
    return [...verified, ...missing];
  }, [studentReadiness, levers]);

  const verify = async (
    evidenceId: string,
    status: "verified" | "rejected",
  ) => {
    setMessage(null);
    const notes = (evidenceNotes[evidenceId] ?? "").trim() || null;
    const expiresLocal = evidenceExpiresAt[evidenceId] ?? "";
    const expiresAt =
      status === "verified" ? toIsoFromDatetimeLocal(expiresLocal) : undefined;
    const res = await fetch("/api/admin/move-os", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "verify_evidence",
        evidenceId,
        status,
        notes,
        ...(expiresAt ? { expiresAt } : {}),
      }),
    });
    if (!res.ok) {
      setMessage("Could not update evidence.");
      return;
    }
    setMessage(`Evidence ${status}.`);
    await load();
  };

  const resolveEscrow = async (matchId: string, outcome: EscrowOutcome) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/move-os", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resolve_escrow",
          matchId,
          outcome,
        }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setMessage(payload.error || "Could not resolve escrow.");
        return;
      }
      setMessage(`Escrow ${outcome} for match ${matchId}.`);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const expireHolds = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/move-os", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "expire_holds" }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        expired?: number;
      };
      if (!res.ok) {
        setMessage(payload.error || "Could not expire holds.");
        return;
      }
      setMessage(`Expired ${payload.expired ?? 0} stale bench hold(s).`);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const lookupStudent = async () => {
    const id = studentLookupId.trim();
    if (!id) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/admin/move-os?studentId=${encodeURIComponent(id)}`,
        { cache: "no-store" },
      );
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        readiness?: StudentReadiness;
        student?: { id: string } | null;
        supersededByKind?: Record<
          string,
          Array<{ id: string; label: string; createdAt?: string | null }>
        >;
      };
      if (!res.ok || !payload.student) {
        setStudentReadiness(null);
        setStudentSuperseded([]);
        setMessage(payload.error || "Student not found.");
        return;
      }
      setStudentReadiness(payload.readiness ?? null);
      const superseded = Object.entries(payload.supersededByKind ?? {}).map(
        ([kind, versions]) => ({
          kind,
          count: versions.length,
          labels: versions.slice(0, 3).map((v) => v.label),
        }),
      );
      setStudentSuperseded(superseded);
      setMessage(`Loaded readiness for ${payload.student.id}.`);
    } finally {
      setBusy(false);
    }
  };

  const saveLevers = async () => {
    if (!levers) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/move-os", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_levers", levers }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        levers?: MoveOsLevers;
      };
      if (!res.ok) {
        setMessage(payload.error || "Could not save levers.");
        return;
      }
      if (payload.levers) setLevers(payload.levers);
      setMessage("Move OS levers saved.");
    } finally {
      setBusy(false);
    }
  };

  const grantCredits = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/move-os", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "grant_company_credits",
          companyId: grantCompanyId.trim(),
          amount: grantAmount,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        credits?: number;
      };
      if (!res.ok) {
        setMessage(payload.error || "Could not grant credits.");
        return;
      }
      setMessage(`Granted. Company balance: ${payload.credits ?? "updated"}.`);
    } finally {
      setBusy(false);
    }
  };

  const escrowsByMatch = useMemo(() => {
    const map = new Map<string, Array<Record<string, unknown>>>();
    for (const row of lockedEscrows) {
      const matchId = String(row.matchId ?? "");
      if (!matchId) continue;
      const list = map.get(matchId) ?? [];
      list.push(row);
      map.set(matchId, list);
    }
    return [...map.entries()];
  }, [lockedEscrows]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-text-label">
          Move OS
        </p>
        <h1 className="font-serif text-3xl text-text-primary">
          Evidence, bench, and shared itineraries.
        </h1>
        <p className="text-sm text-text-secondary">
          Verify Dubai-Ready vault items, fund dual-commit stakes, and tune Move
          OS levers.
        </p>
      </header>

      {message ? <p className="text-sm text-text-secondary">{message}</p> : null}

      <section className="space-y-3 rounded-radius border border-border p-4">
        <h2 className="font-serif text-xl">Student readiness</h2>
        <div className="flex flex-wrap gap-2">
          <Input
            label="Student ID"
            value={studentLookupId}
            onChange={(e) => setStudentLookupId(e.target.value)}
          />
          <Button
            type="button"
            disabled={busy || !studentLookupId.trim()}
            onClick={() => void lookupStudent()}
          >
            Load
          </Button>
        </div>
        {studentReadiness ? (
          <div className="space-y-2 text-sm text-text-secondary">
            <p>
              Score{" "}
              <span className="font-serif text-2xl text-fill-accent">
                {studentReadiness.score}
              </span>{" "}
              · Bench {studentReadiness.benchStatus}
            </p>
            {readinessBreakdown && readinessBreakdown.length > 0 ? (
              <ul className="space-y-1 text-xs">
                {readinessBreakdown.map((row) => (
                  <li key={`${row.status}-${row.kind}`}>
                    <span
                      className={
                        row.status === "verified"
                          ? "text-text-success"
                          : "text-text-warning"
                      }
                    >
                      {row.status === "verified" ? "Verified" : "Missing"}
                    </span>
                    {": "}
                    {row.kind} · weight {row.weight}
                    {row.status === "verified"
                      ? ` (+${row.weight})`
                      : ` (0 / ${row.weight})`}
                  </li>
                ))}
              </ul>
            ) : (
              <>
                <p className="text-xs">
                  Verified:{" "}
                  {studentReadiness.verifiedKinds.length
                    ? studentReadiness.verifiedKinds.join(", ")
                    : "none"}
                </p>
                <p className="text-xs">
                  Missing:{" "}
                  {studentReadiness.missingKinds.length
                    ? studentReadiness.missingKinds.join(", ")
                    : "none"}
                </p>
              </>
            )}
            {studentSuperseded.length > 0 ? (
              <div className="space-y-1 border-t border-border pt-2 text-xs">
                <p className="font-medium text-text-primary">
                  Evidence version history
                </p>
                {studentSuperseded.map((row) => (
                  <p key={row.kind}>
                    {row.kind}: {row.count} superseded
                    {row.labels.length
                      ? ` (${row.labels.join(", ")}${
                          row.count > row.labels.length ? "…" : ""
                        })`
                      : ""}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="space-y-2">
        <h2 className="font-serif text-xl">Pending evidence</h2>
        {pendingEvidence.length === 0 ? (
          <p className="text-sm text-text-muted">Queue clear.</p>
        ) : (
          pendingEvidence.map((item) => {
            const id = String(item.id);
            const url = fileUrl(item);
            return (
              <div
                key={id}
                className="space-y-2 rounded-radius border border-border px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {String(item.label ?? item.kind)} ·{" "}
                      {String(item.studentId)}
                    </p>
                    <p className="text-xs text-text-muted">
                      {String(item.kind)}
                    </p>
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-fill-brand underline"
                      >
                        Open file
                      </a>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void verify(id, "verified")}
                    >
                      Verify
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void verify(id, "rejected")}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Textarea
                    label="Notes (optional)"
                    value={evidenceNotes[id] ?? ""}
                    onChange={(e) =>
                      setEvidenceNotes((prev) => ({
                        ...prev,
                        [id]: e.target.value,
                      }))
                    }
                  />
                  <Input
                    label="Expires (optional)"
                    type="datetime-local"
                    value={evidenceExpiresAt[id] ?? ""}
                    onChange={(e) =>
                      setEvidenceExpiresAt((prev) => ({
                        ...prev,
                        [id]: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            );
          })
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-radius border border-border p-4">
          <h2 className="font-serif text-xl">Bench ready</h2>
          <p className="mt-1 text-3xl font-serif text-fill-accent">
            {readyBench.length}
          </p>
        </div>
        <div className="rounded-radius border border-border p-4">
          <h2 className="font-serif text-xl">Active moves</h2>
          <p className="mt-1 text-3xl font-serif text-fill-accent">
            {activeMoves.length}
          </p>
        </div>
      </section>

      <section className="space-y-3 rounded-radius border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-serif text-xl">Locked escrows</h2>
          <p className="text-xs text-text-muted">
            Dispute resolve via matchId
          </p>
        </div>
        {escrowsByMatch.length === 0 ? (
          <p className="text-sm text-text-muted">No locked escrows.</p>
        ) : (
          escrowsByMatch.map(([matchId, rows]) => (
            <div
              key={matchId}
              className="space-y-2 rounded-radius border border-border px-3 py-2 text-sm"
            >
              <p className="font-medium">Match {matchId}</p>
              <ul className="space-y-1 text-xs text-text-secondary">
                {rows.map((row) => (
                  <li key={String(row.id)}>
                    {String(row.party)} · {String(row.partyId)} ·{" "}
                    {String(row.amount)} credits
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["release", "Release"],
                    ["refund_both", "Refund both"],
                    ["forfeit_student", "Forfeit student"],
                    ["forfeit_company", "Forfeit company"],
                  ] as const
                ).map(([outcome, label]) => (
                  <Button
                    key={outcome}
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void resolveEscrow(matchId, outcome)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      <section className="space-y-3 rounded-radius border border-border p-4">
        <h2 className="font-serif text-xl">SLA breached moves</h2>
        {slaBreachedMoves.length === 0 ? (
          <p className="text-sm text-text-muted">None breached.</p>
        ) : (
          slaBreachedMoves.map((move) => (
            <div
              key={String(move.id)}
              className="rounded-radius border border-border px-3 py-2 text-sm"
            >
              <p className="font-medium">
                Move {String(move.id)} · match {String(move.matchId ?? "—")}
              </p>
              <p className="text-xs text-text-muted">
                Student {String(move.studentId ?? "—")} · Company{" "}
                {String(move.companyId ?? "—")}
              </p>
            </div>
          ))
        )}
      </section>

      <section className="space-y-3 rounded-radius border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-serif text-xl">Holds expiring soon</h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void expireHolds()}
          >
            Expire stale holds
          </Button>
        </div>
        {heldReservations.length === 0 ? (
          <p className="text-sm text-text-muted">No holds in the next 24h.</p>
        ) : (
          heldReservations.map((hold) => (
            <div
              key={String(hold.id)}
              className="rounded-radius border border-border px-3 py-2 text-sm"
            >
              <p className="font-medium">
                {String(hold.studentId)} · company {String(hold.companyId)}
              </p>
              <p className="text-xs text-text-muted">
                Expires {String(hold.expiresAt ?? "—")}
              </p>
            </div>
          ))
        )}
      </section>

      <section className="space-y-3 rounded-radius border border-border p-4">
        <h2 className="font-serif text-xl">Grant company credits</h2>
        <p className="text-sm text-text-secondary">
          Fund employer dual-commit stakes (`companies.credits`).
        </p>
        <div className="flex flex-wrap gap-2">
          <Input
            label="Company ID"
            value={grantCompanyId}
            onChange={(e) => setGrantCompanyId(e.target.value)}
          />
          <Input
            label="Amount"
            type="number"
            value={String(grantAmount)}
            onChange={(e) => setGrantAmount(Number(e.target.value))}
          />
          <Button
            type="button"
            disabled={busy || !grantCompanyId.trim() || grantAmount <= 0}
            onClick={() => void grantCredits()}
          >
            Grant
          </Button>
        </div>
      </section>

      {levers ? (
        <section className="space-y-3 rounded-radius border border-border p-4">
          <h2 className="font-serif text-xl">Move OS levers</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["benchReadyMinScore", "Bench min score"],
                ["benchHoldHours", "Bench hold (hours)"],
                ["dualCommitStudentCredits", "Student stake"],
                ["dualCommitCompanyCredits", "Company stake"],
                ["dualCommitInsuranceCredits", "Insurance stake"],
                ["arrivalSlaHours", "Arrival SLA (hours)"],
                ["arrivalSlaWarningHours", "Arrival SLA warning (hours)"],
                ["shadowSprintDays", "Shadow sprint days"],
              ] as const
            ).map(([key, label]) => (
              <Input
                key={key}
                label={label}
                type="number"
                value={String(Number(levers[key] ?? 0))}
                onChange={(e) =>
                  setLevers((prev) =>
                    prev ? { ...prev, [key]: Number(e.target.value) } : prev,
                  )
                }
              />
            ))}
          </div>
          <Button type="button" disabled={busy} onClick={() => void saveLevers()}>
            Save levers
          </Button>
        </section>
      ) : null}
    </div>
  );
}
