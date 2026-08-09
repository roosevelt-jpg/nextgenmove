import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";
import type {
  ShadowSprint,
  ShadowSprintRubricScore,
} from "@/types/move-os";
import { getMoveOsLevers } from "./config";
import { updateMilestone } from "./itinerary";
import { notifyMoveOsParty, resolveUserEmail } from "./notify";

function averageRubricScore(scores: ShadowSprintRubricScore[]): number {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((acc, row) => acc + row.score, 0);
  return Math.max(1, Math.min(5, Math.round(sum / scores.length)));
}

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
  templateId?: string | null;
  rubric?: string[];
}): Promise<ShadowSprint> {
  const levers = await getMoveOsLevers();
  let title = input.title;
  let brief = input.brief;
  let templateId = input.templateId ?? null;
  let rubric = input.rubric ?? [];

  if (templateId) {
    const template = levers.shadowSprintTemplates.find((t) => t.id === templateId);
    if (template) {
      title = template.title;
      brief = template.brief;
      rubric = template.rubric;
    }
  }

  const ref = adminDb.collection("shadow_sprints").doc();
  const startsAt = new Date().toISOString();
  const endsAt = addDaysIso(levers.shadowSprintDays);
  const doc = stripUndefined({
    id: ref.id,
    matchId: input.matchId,
    moveId: input.moveId,
    studentId: input.studentId,
    companyId: input.companyId,
    title,
    brief,
    templateId,
    rubric: rubric.length > 0 ? rubric : null,
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

  void (async () => {
    const emailTo = await resolveUserEmail(input.studentId);
    await notifyMoveOsParty({
      userId: input.studentId,
      kind: "sprint_started",
      body: `Shadow sprint started: ${title}. Due by ${endsAt}.`,
      link: "/student/move",
      emailTo,
    });
  })();

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

  void (async () => {
    const emailTo = await resolveUserEmail(data.companyId);
    await notifyMoveOsParty({
      userId: data.companyId,
      kind: "sprint_submitted",
      body: `Shadow sprint deliverable submitted for ${data.title}.`,
      link: "/employer/bench",
      emailTo,
    });
  })();

  return { ...data, deliverableUrl: input.deliverableUrl, status: "submitted" };
}

async function emailSprintFinalDecision(sprint: ShadowSprint, status: "go" | "no_go") {
  const [studentEmail, companyEmail] = await Promise.all([
    resolveUserEmail(sprint.studentId),
    resolveUserEmail(sprint.companyId),
  ]);
  const kind = status === "go" ? "sprint_go" : "sprint_no_go";
  const body =
    status === "go"
      ? `Shadow sprint "${sprint.title}" received dual GO.`
      : `Shadow sprint "${sprint.title}" ended in NO-GO.`;

  void notifyMoveOsParty({
    userId: sprint.studentId,
    kind,
    body,
    link: "/student/move",
    emailTo: studentEmail,
  });
  void notifyMoveOsParty({
    userId: sprint.companyId,
    kind,
    body,
    link: "/employer/bench",
    emailTo: companyEmail,
  });
}

export async function rateShadowSprint(input: {
  sprintId: string;
  actor: "student" | "company";
  actorId: string;
  rating?: number;
  go: boolean;
  rubricScores?: ShadowSprintRubricScore[] | null;
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

  const rubricScores =
    input.rubricScores && input.rubricScores.length > 0
      ? input.rubricScores.map((row) => ({
          label: String(row.label).trim().slice(0, 120),
          score: Math.max(1, Math.min(5, Math.round(Number(row.score)))),
        }))
      : null;
  const rating =
    rubricScores && rubricScores.length > 0
      ? averageRubricScore(rubricScores)
      : Math.max(1, Math.min(5, Math.round(Number(input.rating ?? (input.go ? 5 : 2)))));

  const patch =
    input.actor === "student"
      ? {
          studentRating: rating,
          studentGo: input.go,
          studentRubricScores: rubricScores,
        }
      : {
          companyRating: rating,
          companyGo: input.go,
          companyRubricScores: rubricScores,
        };

  const studentGo =
    input.actor === "student" ? input.go : (data.studentGo ?? null);
  const companyGo =
    input.actor === "company" ? input.go : (data.companyGo ?? null);

  const previousStatus = data.status;
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

  const becameFinal =
    (status === "go" || status === "no_go") &&
    previousStatus !== "go" &&
    previousStatus !== "no_go";
  if (becameFinal && (status === "go" || status === "no_go")) {
    void emailSprintFinalDecision(
      { ...data, ...patch, status },
      status,
    );
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
