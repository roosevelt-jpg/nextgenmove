"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui";
import type {
  BenchReservation,
  MoveItinerary,
  ShadowSprint,
} from "@/types/move-os";

interface BenchCard {
  id: string;
  dubaiReadyScore: number;
  benchStatus: string;
  sector: string;
  seniority: string;
  nationality: string;
  targetCities: string[];
  skills: string[];
}

type SlaInfo = {
  withinSla: boolean;
  deadline: string | null;
  breached: boolean;
  hasDayOne: boolean;
  hasLanded: boolean;
} | null;

export function EmployerBenchView() {
  const [bench, setBench] = useState<BenchCard[]>([]);
  const [reservations, setReservations] = useState<BenchReservation[]>([]);
  const [moves, setMoves] = useState<MoveItinerary[]>([]);
  const [sprints, setSprints] = useState<ShadowSprint[]>([]);
  const [slaByMoveId, setSlaByMoveId] = useState<Record<string, SlaInfo>>({});
  const [companyCredits, setCompanyCredits] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/employer/bench", { cache: "no-store" });
    if (!res.ok) return;
    const payload = (await res.json()) as {
      bench: BenchCard[];
      reservations: BenchReservation[];
      moves: MoveItinerary[];
      sprints: ShadowSprint[];
      companyCredits: number;
      slaByMoveId: Record<string, SlaInfo>;
    };
    setBench(payload.bench ?? []);
    setReservations(payload.reservations ?? []);
    setMoves(payload.moves ?? []);
    setSprints(payload.sprints ?? []);
    setCompanyCredits(payload.companyCredits ?? 0);
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

  const reserve = async (studentId: string) => {
    setBusyId(studentId);
    setMessage(null);
    try {
      const res = await fetch("/api/employer/bench", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage(payload.error || "Could not reserve seat.");
        return;
      }
      setMessage("Seat reserved. Shared Move Itinerary created.");
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const cancelHold = async (reservationId: string) => {
    setBusyId(reservationId);
    setMessage(null);
    try {
      const res = await fetch("/api/employer/bench", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel_reservation",
          reservationId,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage(payload.error || "Could not cancel hold.");
        return;
      }
      setMessage("Hold cancelled. Student returned to bench.");
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const postMove = async (body: Record<string, unknown>, okMsg: string) => {
    setMessage(null);
    const res = await fetch("/api/employer/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setMessage(payload.error || "Action failed.");
      return;
    }
    setMessage(okMsg);
    await load();
  };

  const held = reservations.filter((r) => r.status === "held");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-2">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-text-label">
          Visa-Cleared Bench
        </p>
        <h1 className="font-serif text-3xl text-text-primary">
          Reserve talent ready to move.
        </h1>
        <p className="text-sm text-text-secondary">
          Inventory of Dubai-Ready students — not an application inbox. Company
          commit credits: {companyCredits}.
        </p>
      </header>

      {message ? <p className="text-sm text-text-secondary">{message}</p> : null}

      <section className="space-y-2">
        <h2 className="font-serif text-xl text-text-primary">Ready now</h2>
        {bench.length === 0 ? (
          <p className="text-sm text-text-muted">
            No visa-cleared talent on the bench yet.
          </p>
        ) : (
          bench.map((student) => (
            <div
              key={student.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-radius border border-border px-3 py-3"
            >
              <div>
                <p className="font-medium text-text-primary">
                  Score {student.dubaiReadyScore} · {student.sector} ·{" "}
                  {student.seniority}
                </p>
                <p className="text-xs text-text-muted">
                  {student.nationality}
                  {student.targetCities?.length
                    ? ` · ${student.targetCities.slice(0, 2).join(", ")}`
                    : ""}
                  {student.skills?.length
                    ? ` · ${student.skills.slice(0, 4).join(", ")}`
                    : ""}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                disabled={busyId === student.id}
                onClick={() => void reserve(student.id)}
              >
                Reserve seat
              </Button>
            </div>
          ))
        )}
      </section>

      {held.length > 0 ? (
        <section className="space-y-2">
          <h2 className="font-serif text-xl text-text-primary">Active holds</h2>
          {held.map((reservation) => (
            <div
              key={reservation.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-radius border border-border px-3 py-2 text-sm"
            >
              <p>
                Student {reservation.studentId.slice(0, 8)}… · expires{" "}
                {new Date(reservation.expiresAt).toLocaleString()}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busyId === reservation.id}
                onClick={() => void cancelHold(reservation.id)}
              >
                Cancel hold
              </Button>
            </div>
          ))}
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className="font-serif text-xl text-text-primary">Active moves</h2>
        {moves.length === 0 ? (
          <p className="text-sm text-text-muted">No shared itineraries yet.</p>
        ) : (
          moves.map((move) => {
            const sla = slaByMoveId[move.id];
            const moveSprints = sprintsByMove.get(move.id) ?? [];
            return (
              <div
                key={move.id}
                className="space-y-3 rounded-radius border border-border p-3"
              >
                {sla?.deadline ? (
                  <p className="text-xs text-text-muted">
                    Arrival SLA: {new Date(sla.deadline).toLocaleString()}
                    {sla.breached ? " · breached" : sla.withinSla ? " · on track" : ""}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      void postMove(
                        {
                          action: "dual_commit",
                          moveId: move.id,
                          matchId: move.matchId,
                        },
                        "Dual commit locked.",
                      )
                    }
                  >
                    Lock dual commit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void postMove(
                        {
                          action: "start_shadow_sprint",
                          moveId: move.id,
                          matchId: move.matchId,
                          title: "Pre-flight shadow sprint",
                          brief:
                            "Complete a 5-day micro-project in our real workflow before travel.",
                        },
                        "Shadow sprint started.",
                      )
                    }
                  >
                    Start shadow sprint
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void postMove(
                        {
                          action: "arrival_event",
                          moveId: move.id,
                          kind: "landed",
                        },
                        "Recorded: landed",
                      )
                    }
                  >
                    Mark landed
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void postMove(
                        {
                          action: "arrival_event",
                          moveId: move.id,
                          kind: "housing_checkin",
                        },
                        "Recorded: housing",
                      )
                    }
                  >
                    Housing check-in
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      void postMove(
                        {
                          action: "arrival_event",
                          moveId: move.id,
                          kind: "day_one",
                        },
                        "Recorded: day one",
                      )
                    }
                  >
                    Day one
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void postMove(
                        {
                          action: "arrival_event",
                          moveId: move.id,
                          kind: "sla_met",
                        },
                        "Recorded: SLA met",
                      )
                    }
                  >
                    SLA met
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void postMove(
                        {
                          action: "arrival_event",
                          moveId: move.id,
                          kind: "sla_miss",
                        },
                        "Recorded: SLA miss",
                      )
                    }
                  >
                    SLA miss
                  </Button>
                </div>

                {moveSprints.map((sprint) => (
                  <div
                    key={sprint.id}
                    className="space-y-2 rounded-radius border border-border px-3 py-2 text-sm"
                  >
                    <p className="font-medium">
                      Sprint: {sprint.title} · {sprint.status}
                    </p>
                    {sprint.deliverableUrl ? (
                      <a
                        href={sprint.deliverableUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-fill-brand underline"
                      >
                        Review deliverable
                      </a>
                    ) : (
                      <p className="text-xs text-text-muted">
                        Waiting for student deliverable.
                      </p>
                    )}
                    {sprint.companyGo == null ? (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() =>
                            void postMove(
                              {
                                action: "sprint_rate",
                                sprintId: sprint.id,
                                rating: 5,
                                go: true,
                              },
                              "Company GO recorded.",
                            )
                          }
                        >
                          GO
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            void postMove(
                              {
                                action: "sprint_rate",
                                sprintId: sprint.id,
                                rating: 2,
                                go: false,
                              },
                              "Company NO-GO recorded.",
                            )
                          }
                        >
                          NO-GO
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))}

                <ol className="space-y-1 text-sm">
                  {(move.milestones ?? []).slice(0, 9).map((m) => (
                    <li key={m.key} className="flex justify-between gap-2">
                      <span>{m.label}</span>
                      <span className="text-text-muted">{m.status}</span>
                    </li>
                  ))}
                </ol>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
