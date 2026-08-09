import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";
import type { ArrivalEvent, ArrivalEventKind } from "@/types/move-os";
import { getMoveOsLevers } from "./config";
import { resolveDualCommit } from "./escrow";
import { getMoveById, updateMilestone } from "./itinerary";
import { notifyMoveOsParty, resolveUserEmail } from "./notify";

async function notifyArrivalParties(input: {
  studentId: string;
  companyId: string;
  kind: "arrival_sla_warning" | "arrival_sla_breach";
  body: string;
}): Promise<void> {
  const [studentEmail, companyEmail] = await Promise.all([
    resolveUserEmail(input.studentId),
    resolveUserEmail(input.companyId),
  ]);
  void notifyMoveOsParty({
    userId: input.studentId,
    kind: input.kind,
    body: input.body,
    link: "/student/move",
    emailTo: studentEmail,
  });
  void notifyMoveOsParty({
    userId: input.companyId,
    kind: input.kind,
    body: input.body,
    link: "/employer/bench",
    emailTo: companyEmail,
  });
}

export async function recordArrivalEvent(input: {
  moveId: string;
  kind: ArrivalEventKind;
  notedBy: string;
  note?: string | null;
}): Promise<ArrivalEvent> {
  const move = await getMoveById(input.moveId);
  if (!move) throw new Error("move_not_found");

  const ref = adminDb.collection("arrival_events").doc();
  const notedAt = new Date().toISOString();
  const event = stripUndefined({
    id: ref.id,
    moveId: input.moveId,
    matchId: move.matchId,
    kind: input.kind,
    notedBy: input.notedBy,
    notedAt,
    note: input.note ?? null,
  });
  await ref.set({
    ...event,
    createdAt: FieldValue.serverTimestamp(),
  });

  if (input.kind === "landed") {
    await updateMilestone({
      moveId: input.moveId,
      key: "arrival",
      status: "in_progress",
    });
  }
  if (input.kind === "housing_checkin") {
    await updateMilestone({
      moveId: input.moveId,
      key: "housing",
      status: "done",
    });
  }
  if (input.kind === "day_one") {
    await updateMilestone({
      moveId: input.moveId,
      key: "arrival",
      status: "done",
    });
    await updateMilestone({
      moveId: input.moveId,
      key: "day_one",
      status: "done",
    });
    await resolveDualCommit({
      matchId: move.matchId,
      outcome: "release",
    });
    await adminDb
      .collection("students")
      .doc(move.studentId)
      .set({ benchStatus: "placed" }, { merge: true });
  }
  if (input.kind === "sla_miss") {
    await adminDb.collection("move_itineraries").doc(input.moveId).set(
      stripUndefined({
        status: "sla_breached",
        updatedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true },
    );
    await resolveDualCommit({
      matchId: move.matchId,
      outcome: "refund_both",
    });
    const breachBody =
      "Arrival SLA was breached. Dual-commit stakes were refunded to both parties.";
    void notifyArrivalParties({
      studentId: move.studentId,
      companyId: move.companyId,
      kind: "arrival_sla_breach",
      body: breachBody,
    });
  }
  if (input.kind === "sla_met") {
    await resolveDualCommit({
      matchId: move.matchId,
      outcome: "release",
    });
  }

  // Best-effort Family Trust Pack WhatsApp digest for opt-in sponsors.
  void import("./sponsor")
    .then(({ notifySponsorsOnArrival }) =>
      notifySponsorsOnArrival({
        studentId: move.studentId,
        eventKind: input.kind,
      }),
    )
    .catch((error) => {
      console.error("sponsor_arrival_digest_failed", error);
    });

  return event as ArrivalEvent;
}

export async function evaluateArrivalSla(moveId: string): Promise<{
  withinSla: boolean;
  deadline: string | null;
  breached: boolean;
  hasDayOne: boolean;
  hasLanded: boolean;
  /** True when deadline is within the warning window and not yet breached. */
  inWarningWindow: boolean;
}> {
  const move = await getMoveById(moveId);
  if (!move) throw new Error("move_not_found");
  const levers = await getMoveOsLevers();
  const warningHours =
    Number(levers.arrivalSlaWarningHours ?? 48) > 0
      ? Number(levers.arrivalSlaWarningHours ?? 48)
      : 48;
  const flight = move.milestones.find((m) => m.key === "flight");
  const arrival = move.milestones.find((m) => m.key === "arrival");
  const baseline =
    flight?.completedAt ||
    arrival?.completedAt ||
    move.startDate ||
    move.updatedAt ||
    move.createdAt;
  if (!baseline) {
    return {
      withinSla: true,
      deadline: null,
      breached: false,
      hasDayOne: false,
      hasLanded: false,
      inWarningWindow: false,
    };
  }
  const deadlineMs =
    Date.parse(String(baseline)) + levers.arrivalSlaHours * 60 * 60 * 1000;
  const deadline = new Date(deadlineMs).toISOString();
  const events = await adminDb
    .collection("arrival_events")
    .where("moveId", "==", moveId)
    .get();
  const kinds = new Set(events.docs.map((d) => String(d.data().kind)));
  const hasLanded = kinds.has("landed");
  const hasDayOne = kinds.has("day_one") || kinds.has("sla_met");
  const alreadyMiss = kinds.has("sla_miss") || move.status === "sla_breached";
  const now = Date.now();
  const pastDeadline = now > deadlineMs;
  const withinSla = !pastDeadline || hasDayOne;
  const msUntilDeadline = deadlineMs - now;
  const warningMs = warningHours * 60 * 60 * 1000;
  const inWarningWindow =
    !alreadyMiss &&
    !hasDayOne &&
    !pastDeadline &&
    msUntilDeadline > 0 &&
    msUntilDeadline <= warningMs;
  return {
    withinSla,
    deadline,
    breached: alreadyMiss || (pastDeadline && !hasDayOne),
    hasDayOne,
    hasLanded,
    inWarningWindow,
  };
}

/**
 * Emit `arrival_sla_warning` when deadline is within the warning window
 * (levers.arrivalSlaWarningHours, default 48h) but not yet breached.
 */
export async function emitArrivalSlaWarnings(limit = 40): Promise<number> {
  const snap = await adminDb
    .collection("move_itineraries")
    .where("status", "==", "active")
    .limit(limit)
    .get();
  let warned = 0;
  for (const doc of snap.docs) {
    const data = doc.data() as {
      studentId?: string;
      companyId?: string;
      arrivalSlaWarnedAt?: string | null;
    };
    if (data.arrivalSlaWarnedAt) continue;
    const evalResult = await evaluateArrivalSla(doc.id);
    if (!evalResult.inWarningWindow || !evalResult.deadline) continue;
    if (!data.studentId || !data.companyId) continue;

    const body = `Arrival SLA deadline is approaching (${evalResult.deadline}). Confirm day-one before the window closes.`;
    await notifyArrivalParties({
      studentId: data.studentId,
      companyId: data.companyId,
      kind: "arrival_sla_warning",
      body,
    });
    await doc.ref.set(
      stripUndefined({
        arrivalSlaWarnedAt: new Date().toISOString(),
        updatedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true },
    );
    warned += 1;
  }
  return warned;
}

/** Auto-flag SLA misses for active moves past deadline without day_one. */
export async function enforceArrivalSlas(limit = 40): Promise<number> {
  const snap = await adminDb
    .collection("move_itineraries")
    .where("status", "==", "active")
    .limit(limit)
    .get();
  let flagged = 0;
  for (const doc of snap.docs) {
    const evalResult = await evaluateArrivalSla(doc.id);
    if (!evalResult.breached || evalResult.hasDayOne) continue;
    const events = await adminDb
      .collection("arrival_events")
      .where("moveId", "==", doc.id)
      .get();
    if (events.docs.some((d) => d.data().kind === "sla_miss")) continue;
    await recordArrivalEvent({
      moveId: doc.id,
      kind: "sla_miss",
      notedBy: "system:arrival_sla_cron",
      note: "Auto-flagged: arrival SLA window elapsed without day one.",
    });
    flagged += 1;
  }
  return flagged;
}
