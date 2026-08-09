import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";
import type { ArrivalEvent, ArrivalEventKind } from "@/types/move-os";
import { getMoveOsLevers } from "./config";
import { resolveDualCommit } from "./escrow";
import { getMoveById, updateMilestone } from "./itinerary";

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
  }
  if (input.kind === "sla_met") {
    await resolveDualCommit({
      matchId: move.matchId,
      outcome: "release",
    });
  }

  return event as ArrivalEvent;
}

export async function evaluateArrivalSla(moveId: string): Promise<{
  withinSla: boolean;
  deadline: string | null;
  breached: boolean;
  hasDayOne: boolean;
  hasLanded: boolean;
}> {
  const move = await getMoveById(moveId);
  if (!move) throw new Error("move_not_found");
  const levers = await getMoveOsLevers();
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
  const pastDeadline = Date.now() > deadlineMs;
  const withinSla = !pastDeadline || hasDayOne;
  return {
    withinSla,
    deadline,
    breached: alreadyMiss || (pastDeadline && !hasDayOne),
    hasDayOne,
    hasLanded,
  };
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
