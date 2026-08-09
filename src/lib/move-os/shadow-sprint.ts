import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";
import type { ShadowSprint } from "@/types/move-os";
import { getMoveOsLevers } from "./config";
import { updateMilestone } from "./itinerary";

function addDaysIso(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export async function createShadowSprint(input: {
  matchId: string;
  moveId: string;
  studentId: string;
  companyId: string;
  title: string;
  brief: string;
}): Promise<ShadowSprint> {
  const levers = await getMoveOsLevers();
  const ref = adminDb.collection("shadow_sprints").doc();
  const startsAt = new Date().toISOString();
  const endsAt = addDaysIso(levers.shadowSprintDays);
  const doc = stripUndefined({
    id: ref.id,
    matchId: input.matchId,
    moveId: input.moveId,
    studentId: input.studentId,
    companyId: input.companyId,
    title: input.title,
    brief: input.brief,
    status: "active" as const,
    deliverableUrl: null,
    studentRating: null,
    companyRating: null,
    studentGo: null,
    companyGo: null,
    startsAt,
    endsAt,
    createdAt: startsAt,
  });
  await ref.set({
    ...doc,
    createdAt: FieldValue.serverTimestamp(),
  });
  await updateMilestone({
    moveId: input.moveId,
    key: "shadow_sprint",
    status: "in_progress",
  });
  return doc as ShadowSprint;
}

export async function submitShadowDeliverable(input: {
  sprintId: string;
  studentId: string;
  deliverableUrl: string;
}): Promise<ShadowSprint> {
  const ref = adminDb.collection("shadow_sprints").doc(input.sprintId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("sprint_not_found");
  const data = snap.data() as ShadowSprint;
  if (data.studentId !== input.studentId) throw new Error("forbidden");
  await ref.set(
    stripUndefined({
      deliverableUrl: input.deliverableUrl,
      status: "submitted",
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );
  return { ...data, deliverableUrl: input.deliverableUrl, status: "submitted" };
}

export async function rateShadowSprint(input: {
  sprintId: string;
  actor: "student" | "company";
  actorId: string;
  rating: number;
  go: boolean;
}): Promise<ShadowSprint> {
  const ref = adminDb.collection("shadow_sprints").doc(input.sprintId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("sprint_not_found");
  const data = snap.data() as ShadowSprint;
  if (input.actor === "student" && data.studentId !== input.actorId) {
    throw new Error("forbidden");
  }
  if (input.actor === "company" && data.companyId !== input.actorId) {
    throw new Error("forbidden");
  }

  const patch =
    input.actor === "student"
      ? { studentRating: input.rating, studentGo: input.go }
      : { companyRating: input.rating, companyGo: input.go };

  const studentGo =
    input.actor === "student" ? input.go : (data.studentGo ?? null);
  const companyGo =
    input.actor === "company" ? input.go : (data.companyGo ?? null);

  let status = data.status;
  if (studentGo !== null && companyGo !== null) {
    status = studentGo && companyGo ? "go" : "no_go";
  } else {
    status = "rated";
  }

  await ref.set(
    stripUndefined({
      ...patch,
      status,
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );

  if (status === "go") {
    await updateMilestone({
      moveId: data.moveId,
      key: "shadow_sprint",
      status: "done",
    });
  } else if (status === "no_go") {
    await updateMilestone({
      moveId: data.moveId,
      key: "shadow_sprint",
      status: "blocked",
      blocker: "Shadow sprint did not get dual GO.",
    });
  }

  return {
    ...data,
    ...patch,
    status,
  };
}

export async function listSprintsForStudent(studentId: string): Promise<ShadowSprint[]> {
  const snap = await adminDb
    .collection("shadow_sprints")
    .where("studentId", "==", studentId)
    .get();
  return snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<ShadowSprint, "id">),
  }));
}

export async function listSprintsForCompany(companyId: string): Promise<ShadowSprint[]> {
  const snap = await adminDb
    .collection("shadow_sprints")
    .where("companyId", "==", companyId)
    .get();
  return snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<ShadowSprint, "id">),
  }));
}
