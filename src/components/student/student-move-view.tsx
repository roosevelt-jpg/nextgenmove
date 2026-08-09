"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Input } from "@/components/ui";
import type { MoveItinerary, ShadowSprint } from "@/types/move-os";

type SlaInfo = {
  withinSla: boolean;
  deadline: string | null;
  breached: boolean;
  hasDayOne: boolean;
  hasLanded: boolean;
} | null;

export function StudentMoveView() {
  const [moves, setMoves] = useState<MoveItinerary[]>([]);
  const [sprints, setSprints] = useState<ShadowSprint[]>([]);
  const [slaByMoveId, setSlaByMoveId] = useState<Record<string, SlaInfo>>({});
  const [sponsorName, setSponsorName] = useState("");
  const [sponsorEmail, setSponsorEmail] = useState("");
  const [sponsorUrl, setSponsorUrl] = useState<string | null>(null);
  const [deliverableUrl, setDeliverableUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/student/move", { cache: "no-store" });
    if (!res.ok) return;
    const payload = (await res.json()) as {
      moves: MoveItinerary[];
      sprints: ShadowSprint[];
      slaByMoveId: Record<string, SlaInfo>;
    };
    setMoves(payload.moves ?? []);
    setSprints(payload.sprints ?? []);
    setSlaByMoveId(payload.slaByMoveId ?? {});
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sprintsByMove = useMemo(() => {
    const map = new Map<string, ShadowSprint[]>();
    for (const sprint of sprints) {
      const list = map.get(sprint.moveId) ?? [];
      list.push(sprint);
      map.set(sprint.moveId, list);
    }
    return map;
  }, [sprints]);

  const dualCommit = async (move: MoveItinerary) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/student/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "dual_commit",
          moveId: move.id,
          matchId: move.matchId,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage(payload.error || "Could not lock dual commit.");
        return;
      }
      setMessage("Dual commit locked.");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const inviteSponsor = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/student/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sponsor_invite",
          sponsorName,
          sponsorEmail,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        url?: string;
      };
      if (!res.ok || !payload.url) {
        setMessage(payload.error || "Could not create sponsor link.");
        return;
      }
      setSponsorUrl(payload.url);
      setMessage("Sponsor trust link created.");
    } finally {
      setBusy(false);
    }
  };

  const submitSprint = async (sprintId: string) => {
    if (!deliverableUrl.trim()) {
      setMessage("Add a deliverable URL first.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/student/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sprint_submit",
          sprintId,
          deliverableUrl: deliverableUrl.trim(),
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage(payload.error || "Could not submit sprint.");
        return;
      }
      setMessage("Shadow sprint submitted.");
      setDeliverableUrl("");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const rateSprint = async (sprintId: string, go: boolean) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/student/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sprint_rate",
          sprintId,
          rating: go ? 5 : 2,
          go,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage(payload.error || "Could not rate sprint.");
        return;
      }
      setMessage(go ? "You voted GO." : "You voted NO-GO.");
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-text-label">
          Shared Move Itinerary
        </p>
        <h1 className="font-serif text-3xl text-text-primary">
          Your Dubai move, one timeline.
        </h1>
        <p className="text-sm text-text-secondary">
          Dual commit, shadow sprint, visa, housing, flight, arrival — same
          truth for you and the employer.
        </p>
      </header>

      {message ? <p className="text-sm text-text-secondary">{message}</p> : null}

      {moves.length === 0 ? (
        <p className="rounded-radius border border-border bg-surface-2 px-4 py-6 text-sm text-text-muted">
          No active move yet. When an employer reserves you from the Visa-Cleared
          Bench or hires you, your itinerary appears here.
        </p>
      ) : (
        moves.map((move) => {
          const sla = slaByMoveId[move.id];
          const moveSprints = sprintsByMove.get(move.id) ?? [];
          return (
            <section
              key={move.id}
              className="space-y-3 rounded-radius border border-border bg-surface-1 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-serif text-xl text-text-primary">
                    Move · {move.status}
                  </h2>
                  {sla?.deadline ? (
                    <p className="text-xs text-text-muted">
                      Arrival SLA deadline:{" "}
                      {new Date(sla.deadline).toLocaleString()}
                      {sla.breached ? " · breached" : ""}
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  onClick={() => void dualCommit(move)}
                >
                  Lock dual commit
                </Button>
              </div>
              <ol className="space-y-2">
                {(move.milestones ?? []).map((milestone) => (
                  <li
                    key={milestone.key}
                    className="flex items-start justify-between gap-3 border-b border-border/70 pb-2 text-sm last:border-0"
                  >
                    <div>
                      <p className="font-medium text-text-primary">
                        {milestone.label}
                      </p>
                      {milestone.blocker ? (
                        <p className="text-xs text-text-warning">
                          {milestone.blocker}
                        </p>
                      ) : null}
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-wide text-text-muted">
                      {milestone.status}
                    </span>
                  </li>
                ))}
              </ol>

              {moveSprints.length > 0 ? (
                <div className="space-y-2 border-t border-border pt-3">
                  <h3 className="font-mono text-[11px] uppercase tracking-wide text-text-label">
                    Shadow sprints
                  </h3>
                  {moveSprints.map((sprint) => (
                    <div
                      key={sprint.id}
                      className="space-y-2 rounded-radius border border-border px-3 py-2 text-sm"
                    >
                      <p className="font-medium">
                        {sprint.title} · {sprint.status}
                      </p>
                      <p className="text-xs text-text-muted">{sprint.brief}</p>
                      {sprint.status === "active" || sprint.status === "proposed" ? (
                        <div className="space-y-2">
                          <Input
                            label="Deliverable URL"
                            value={deliverableUrl}
                            onChange={(e) => setDeliverableUrl(e.target.value)}
                          />
                          <Button
                            type="button"
                            size="sm"
                            disabled={busy}
                            onClick={() => void submitSprint(sprint.id)}
                          >
                            Submit deliverable
                          </Button>
                        </div>
                      ) : null}
                      {sprint.deliverableUrl ? (
                        <a
                          href={sprint.deliverableUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-fill-brand underline"
                        >
                          View deliverable
                        </a>
                      ) : null}
                      {sprint.studentGo == null &&
                      (sprint.status === "submitted" ||
                        sprint.status === "rated" ||
                        sprint.status === "active") ? (
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={busy}
                            onClick={() => void rateSprint(sprint.id, true)}
                          >
                            GO
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => void rateSprint(sprint.id, false)}
                          >
                            NO-GO
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          );
        })
      )}

      <section className="space-y-3 rounded-radius border border-border bg-grad-card p-4">
        <h2 className="font-serif text-xl text-text-primary">
          Parent / sponsor trust portal
        </h2>
        <p className="text-sm text-text-secondary">
          Share a read-only link with whoever funds your move. They see readiness
          and milestones — not employer deal terms.
        </p>
        <Input
          label="Sponsor name"
          value={sponsorName}
          onChange={(e) => setSponsorName(e.target.value)}
        />
        <Input
          label="Sponsor email"
          type="email"
          value={sponsorEmail}
          onChange={(e) => setSponsorEmail(e.target.value)}
        />
        <Button
          type="button"
          disabled={busy || !sponsorName.trim() || !sponsorEmail.trim()}
          onClick={() => void inviteSponsor()}
        >
          Create sponsor link
        </Button>
        {sponsorUrl ? (
          <p className="break-all text-xs text-text-secondary">{sponsorUrl}</p>
        ) : null}
      </section>
    </div>
  );
}
