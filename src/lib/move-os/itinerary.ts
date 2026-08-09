import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";
import type {
  MoveItinerary,
  MoveItineraryStatus,
  MoveMilestone,
  MoveMilestoneKey,
  MoveMilestoneStatus,
} from "@/types/move-os";

const DEFAULT_MILESTONES: Array<{
  key: MoveMilestoneKey;
  label: string;
  visibleToSponsor: boolean;
}> = [
  { key: "dual_commit", label: "Dual commit", visibleToSponsor: true },
  { key: "shadow_sprint", label: "Pre-flight shadow sprint", visibleToSponsor: true },
  { key: "visa", label: "Visa path", visibleToSponsor: true },
  { key: "housing", label: "Housing hold", visibleToSponsor: true },
  { key: "flight", label: "Flight window", visibleToSponsor: true },
  { key: "bank", label: "Bank / funds setup", visibleToSponsor: false },
  { key: "emirates_id", label: "Emirates ID", visibleToSponsor: true },
  { key: "arrival", label: "Arrival", visibleToSponsor: true },
  { key: "day_one", label: "Day one at employer", visibleToSponsor: true },
];

function isoNow() {
  return new Date().toISOString();
}

export function buildDefaultMilestones(): MoveMilestone[] {
  return DEFAULT_MILESTONES.map((item, index) => ({
    key: item.key,
    label: item.label,
    status: (index === 0 ? "pending" : "locked") as MoveMilestoneStatus,
    dueAt: null,
    completedAt: null,
    blocker: null,
    visibleToSponsor: item.visibleToSponsor,
  }));
}

export async function getMoveByMatchId(
  matchId: string,
): Promise<MoveItinerary | null> {
  const snap = await adminDb
    .collection("move_itineraries")
    .where("matchId", "==", matchId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0]!;
  return { id: doc.id, ...(doc.data() as Omit<MoveItinerary, "id">) };
}

export async function getMoveById(moveId: string): Promise<MoveItinerary | null> {
  const snap = await adminDb.collection("move_itineraries").doc(moveId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() as Omit<MoveItinerary, "id">) };
}

export async function listMovesForStudent(
  studentId: string,
): Promise<MoveItinerary[]> {
  const snap = await adminDb
    .collection("move_itineraries")
    .where("studentId", "==", studentId)
    .get();
  return snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<MoveItinerary, "id">),
  }));
}

export async function listMovesForCompany(
  companyId: string,
): Promise<MoveItinerary[]> {
  const snap = await adminDb
    .collection("move_itineraries")
    .where("companyId", "==", companyId)
    .get();
  return snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<MoveItinerary, "id">),
  }));
}

export async function ensureMoveItinerary(input: {
  matchId: string;
  studentId: string;
  companyId: string;
  startDate?: string | null;
}): Promise<MoveItinerary> {
  const existing = await getMoveByMatchId(input.matchId);
  if (existing) return existing;

  const ref = adminDb.collection("move_itineraries").doc();
  const now = isoNow();
  const doc = stripUndefined({
    id: ref.id,
    matchId: input.matchId,
    studentId: input.studentId,
    companyId: input.companyId,
    status: "active" as MoveItineraryStatus,
    startDate: input.startDate ?? null,
    milestones: buildDefaultMilestones(),
    createdAt: now,
    updatedAt: now,
  });
  await ref.set({
    ...doc,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return doc as MoveItinerary;
}

export async function updateMilestone(input: {
  moveId: string;
  key: MoveMilestoneKey;
  status?: MoveMilestoneStatus;
  blocker?: string | null;
  dueAt?: string | null;
}): Promise<MoveItinerary> {
  const ref = adminDb.collection("move_itineraries").doc(input.moveId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("move_not_found");
  const data = snap.data() as MoveItinerary;
  const milestones = (data.milestones ?? []).map((milestone) => {
    if (milestone.key !== input.key) return milestone;
    const status = input.status ?? milestone.status;
    return stripUndefined({
      ...milestone,
      status,
      blocker:
        input.blocker === undefined ? milestone.blocker ?? null : input.blocker,
      dueAt: input.dueAt === undefined ? milestone.dueAt ?? null : input.dueAt,
      completedAt:
        status === "done" ? new Date().toISOString() : milestone.completedAt ?? null,
    }) as MoveMilestone;
  });

  // Unlock next locked milestone when current is done.
  if (input.status === "done") {
    const idx = milestones.findIndex((m) => m.key === input.key);
    const next = milestones[idx + 1];
    if (next && next.status === "locked") {
      milestones[idx + 1] = { ...next, status: "pending" };
    }
  }

  await ref.set(
    stripUndefined({
      milestones,
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );
  return { ...data, id: input.moveId, milestones };
}
