"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui";
import type {
  BenchReservation,
  MoveItinerary,
  ShadowSprint,
  ShadowSprintTemplate,
} from "@/types/move-os";

interface BenchCard {
  id: string;
  dubaiReadyScore: number;
  benchStatus: string;
  sector: string;
  seniority: string;
  nationality: string;
  currentCity?: string;
  targetCities: string[];
  skills: string[];
  missingKinds?: string[];
  verifiedKinds?: string[];
  missingKindsCount?: number;
}

type SlaInfo = {
  withinSla: boolean;
  deadline: string | null;
  breached: boolean;
  hasDayOne: boolean;
  hasLanded: boolean;
} | null;

type CreditPack = {
  id: string;
  label: string;
  credits: number;
  priceEur: number;
};

function formatHoldCountdown(expiresAt: string, nowMs: number): string {
  const end = Date.parse(expiresAt);
  if (Number.isNaN(end)) return "—";
  const ms = end - nowMs;
  if (ms <= 0) return "expired";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function EmployerBenchView() {
  const [bench, setBench] = useState<BenchCard[]>([]);
  const [reservations, setReservations] = useState<BenchReservation[]>([]);
  const [moves, setMoves] = useState<MoveItinerary[]>([]);
  const [sprints, setSprints] = useState<ShadowSprint[]>([]);
  const [templates, setTemplates] = useState<ShadowSprintTemplate[]>([]);
  const [slaByMoveId, setSlaByMoveId] = useState<Record<string, SlaInfo>>({});
  const [companyCredits, setCompanyCredits] = useState(0);
  const [creditPacks, setCreditPacks] = useState<CreditPack[]>([]);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sectorFilter, setSectorFilter] = useState("");
  const [minScore, setMinScore] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [templateByMove, setTemplateByMove] = useState<Record<string, string>>(
    {},
  );
  const [nowMs, setNowMs] = useState(() => Date.now());

  const load = useCallback(async () => {
    const [benchRes, creditsRes, moveRes] = await Promise.all([
      fetch("/api/employer/bench", { cache: "no-store" }),
      fetch("/api/employer/credits/top-up", { cache: "no-store" }),
      fetch("/api/employer/move", { cache: "no-store" }),
    ]);
    if (benchRes.ok) {
      const payload = (await benchRes.json()) as {
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
    }
    if (creditsRes.ok) {
      const payload = (await creditsRes.json()) as {
        packages: CreditPack[];
        credits: number;
        stripeEnabled: boolean;
      };
      setCreditPacks(payload.packages ?? []);
      setCompanyCredits(payload.credits ?? 0);
      setStripeEnabled(Boolean(payload.stripeEnabled));
    }
    if (moveRes.ok) {
      const payload = (await moveRes.json()) as {
        shadowSprintTemplates?: ShadowSprintTemplate[];
      };
      setTemplates(payload.shadowSprintTemplates ?? []);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const credits = params.get("credits");
    if (credits === "success") {
      setMessage("Credit top-up succeeded. Balance refreshes in a moment.");
      void load();
    } else if (credits === "cancelled") {
      setMessage("Credit top-up cancelled.");
    }
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const sprintsByMove = useMemo(() => {
    const map = new Map<string, ShadowSprint[]>();
    for (const sprint of sprints) {
      const list = map.get(sprint.moveId) ?? [];
      list.push(sprint);
      map.set(sprint.moveId, list);
    }
    return map;
  }, [sprints]);

  const sectorOptions = useMemo(() => {
    const set = new Set(
      bench.map((s) => s.sector).filter((s) => Boolean(s?.trim())),
    );
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [bench]);

  const filteredBench = useMemo(() => {
    const min = minScore.trim() === "" ? null : Number(minScore);
    const cityQ = citySearch.trim().toLowerCase();
    return bench.filter((student) => {
      if (sectorFilter && student.sector !== sectorFilter) return false;
      if (min != null && !Number.isNaN(min) && student.dubaiReadyScore < min) {
        return false;
      }
      if (cityQ) {
        const cities = [
          student.currentCity ?? "",
          ...(student.targetCities ?? []),
        ]
          .join(" ")
          .toLowerCase();
        if (!cities.includes(cityQ)) return false;
      }
      return true;
    });
  }, [bench, sectorFilter, minScore, citySearch]);

  const buyCredits = async (packageId: string) => {
    setBusyId(packageId);
    setMessage(null);
    try {
      const res = await fetch("/api/employer/credits/top-up", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({ packageId }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        mode?: string;
        url?: string;
        id?: string;
      };
      if (!res.ok) {
        setMessage(payload.error || "Could not start top-up.");
        return;
      }
      if (payload.mode === "stripe" && payload.url) {
        window.location.href = payload.url;
        return;
      }
      setMessage("Top-up request submitted for admin approval.");
      await load();
    } finally {
      setBusyId(null);
    }
  };

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

  const convertHold = async (reservationId: string) => {
    setBusyId(reservationId);
    setMessage(null);
    try {
      const res = await fetch("/api/employer/bench", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "convert_reservation",
          reservationId,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage(payload.error || "Could not convert hold.");
        return;
      }
      setMessage("Hold converted.");
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
  const defaultTemplateId = templates[0]?.id ?? "";

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

      <section className="space-y-3 rounded-radius border border-border px-3 py-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-serif text-xl text-text-primary">
              Buy commit credits
            </h2>
            <p className="text-xs text-text-muted">
              {stripeEnabled
                ? "Stripe checkout adds credits when payment succeeds."
                : "Stripe offline — requests go to admin for approval."}
            </p>
          </div>
          <p className="font-mono text-sm text-fill-accent">
            Balance {companyCredits}
          </p>
        </div>
        {creditPacks.length === 0 ? (
          <p className="text-sm text-text-muted">No company credit packs configured.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {creditPacks.map((pack) => (
              <Button
                key={pack.id}
                type="button"
                size="sm"
                variant="outline"
                disabled={busyId === pack.id}
                onClick={() => void buyCredits(pack.id)}
              >
                {pack.label} · {pack.credits} cr · €{pack.priceEur}
              </Button>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-wrap gap-3 rounded-radius border border-border px-3 py-3">
        <label className="space-y-1 text-sm">
          <span className="text-text-label">Sector</span>
          <select
            className="block w-full min-w-[10rem] rounded-radius-sm border border-border bg-surface-1 px-2 py-1.5"
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
          >
            <option value="">All</option>
            {sectorOptions.map((sector) => (
              <option key={sector} value={sector}>
                {sector}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-text-label">Min score</span>
          <input
            type="number"
            min={0}
            max={100}
            className="block w-24 rounded-radius-sm border border-border bg-surface-1 px-2 py-1.5"
            value={minScore}
            onChange={(e) => setMinScore(e.target.value)}
            placeholder="0"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-text-label">City</span>
          <input
            type="search"
            className="block min-w-[12rem] rounded-radius-sm border border-border bg-surface-1 px-2 py-1.5"
            value={citySearch}
            onChange={(e) => setCitySearch(e.target.value)}
            placeholder="Search cities"
          />
        </label>
      </section>

      <section className="space-y-2">
        <h2 className="font-serif text-xl text-text-primary">Ready now</h2>
        {filteredBench.length === 0 ? (
          <p className="text-sm text-text-muted">
            No visa-cleared talent on the bench yet.
          </p>
        ) : (
          filteredBench.map((student) => {
            const missingCount =
              student.missingKindsCount ??
              student.missingKinds?.length ??
              0;
            return (
              <div
                key={student.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-radius border border-border px-3 py-3"
              >
                <div>
                  <p className="font-medium text-text-primary">
                    Score {student.dubaiReadyScore}
                    {missingCount > 0
                      ? ` · ${missingCount} missing evidence`
                      : ""}{" "}
                    · {student.sector} · {student.seniority}
                  </p>
                  <p className="text-xs text-text-muted">
                    {student.nationality}
                    {student.currentCity ? ` · ${student.currentCity}` : ""}
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
            );
          })
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
                Student {reservation.studentId.slice(0, 8)}… · hold{" "}
                <span className="font-mono text-fill-accent">
                  {formatHoldCountdown(reservation.expiresAt, nowMs)}
                </span>{" "}
                · expires {new Date(reservation.expiresAt).toLocaleString()}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={busyId === reservation.id}
                  onClick={() => void convertHold(reservation.id)}
                >
                  Convert hold
                </Button>
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
            const selectedTemplate =
              templateByMove[move.id] || defaultTemplateId;
            return (
              <div
                key={move.id}
                className="space-y-3 rounded-radius border border-border p-3"
              >
                {sla?.deadline ? (
                  <p className="text-xs text-text-muted">
                    Arrival SLA: {new Date(sla.deadline).toLocaleString()}
                    {sla.breached
                      ? " · breached"
                      : sla.withinSla
                        ? " · on track"
                        : ""}
                  </p>
                ) : null}
                <div className="flex flex-wrap items-end gap-2">
                  <label className="space-y-1 text-sm">
                    <span className="text-text-label">Sprint template</span>
                    <select
                      className="block min-w-[14rem] rounded-radius-sm border border-border bg-surface-1 px-2 py-1.5"
                      value={selectedTemplate}
                      onChange={(e) =>
                        setTemplateByMove((prev) => ({
                          ...prev,
                          [move.id]: e.target.value,
                        }))
                      }
                    >
                      {templates.length === 0 ? (
                        <option value="">Default brief</option>
                      ) : (
                        templates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.sector} · {template.title}
                          </option>
                        ))
                      )}
                    </select>
                  </label>
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
                          ...(selectedTemplate
                            ? { templateId: selectedTemplate }
                            : {}),
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
                    {sprint.rubric?.length ? (
                      <p className="text-xs text-text-muted">
                        Rubric: {sprint.rubric.join(" · ")}
                      </p>
                    ) : null}
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
