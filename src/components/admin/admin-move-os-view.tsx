"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Input } from "@/components/ui";
import type { MoveOsLevers, StudentReadiness } from "@/types/move-os";

function fileUrl(item: Record<string, unknown>): string | null {
  const file = item.file as { url?: string } | undefined;
  if (file?.url) return String(file.url);
  if (typeof item.url === "string") return item.url;
  return null;
}

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
  const [levers, setLevers] = useState<MoveOsLevers | null>(null);
  const [grantCompanyId, setGrantCompanyId] = useState("");
  const [grantAmount, setGrantAmount] = useState(100);
  const [studentLookupId, setStudentLookupId] = useState("");
  const [studentReadiness, setStudentReadiness] =
    useState<StudentReadiness | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/move-os", { cache: "no-store" });
    if (!res.ok) return;
    const payload = (await res.json()) as {
      pendingEvidence: Array<Record<string, unknown>>;
      readyBench: Array<Record<string, unknown>>;
      activeMoves: Array<Record<string, unknown>>;
      levers: MoveOsLevers;
    };
    setPendingEvidence(payload.pendingEvidence ?? []);
    setReadyBench(payload.readyBench ?? []);
    setActiveMoves(payload.activeMoves ?? []);
    setLevers(payload.levers ?? null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const verify = async (evidenceId: string, status: "verified" | "rejected") => {
    setMessage(null);
    const res = await fetch("/api/admin/move-os", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify_evidence", evidenceId, status }),
    });
    if (!res.ok) {
      setMessage("Could not update evidence.");
      return;
    }
    setMessage(`Evidence ${status}.`);
    await load();
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
      };
      if (!res.ok || !payload.student) {
        setStudentReadiness(null);
        setMessage(payload.error || "Student not found.");
        return;
      }
      setStudentReadiness(payload.readiness ?? null);
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
          <div className="space-y-1 text-sm text-text-secondary">
            <p>
              Score{" "}
              <span className="font-serif text-2xl text-fill-accent">
                {studentReadiness.score}
              </span>{" "}
              · Bench {studentReadiness.benchStatus}
            </p>
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
          </div>
        ) : null}
      </section>

      <section className="space-y-2">
        <h2 className="font-serif text-xl">Pending evidence</h2>
        {pendingEvidence.length === 0 ? (
          <p className="text-sm text-text-muted">Queue clear.</p>
        ) : (
          pendingEvidence.map((item) => {
            const url = fileUrl(item);
            return (
              <div
                key={String(item.id)}
                className="flex flex-wrap items-center justify-between gap-2 rounded-radius border border-border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {String(item.label ?? item.kind)} · {String(item.studentId)}
                  </p>
                  <p className="text-xs text-text-muted">{String(item.kind)}</p>
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
                    onClick={() => void verify(String(item.id), "verified")}
                  >
                    Verify
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void verify(String(item.id), "rejected")}
                  >
                    Reject
                  </Button>
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
                ["arrivalSlaHours", "Arrival SLA (hours)"],
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
