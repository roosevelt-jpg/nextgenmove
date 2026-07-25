import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { upsertMatchAccess } from "@/lib/match-access";
import { matchDocId } from "@/lib/matching/recompute";
import { computeMatchScore } from "@/lib/matching/score";
import { stripUndefined } from "@/lib/stripUndefined";
import { createNotification } from "@/lib/notifications/create";
import { notifyAdminsOfPending } from "@/lib/email/notify-admins";
import { notifyProfileUnlocked } from "@/lib/email/notify";
import { anonymizedDisplayName } from "@/lib/employer/student-visibility";
import type { UnlockRequestStatus } from "@/lib/employer/student-visibility";

export const PROFILE_UNLOCK_TYPE = "profile_unlock";

export async function getUnlockRequestStatus(
  companyId: string,
  studentId: string,
): Promise<UnlockRequestStatus> {
  const snap = await adminDb
    .collection("requests")
    .where("type", "==", PROFILE_UNLOCK_TYPE)
    .where("companyId", "==", companyId)
    .where("studentId", "==", studentId)
    .get();

  if (snap.empty) return "none";

  let hasPending = false;
  let hasApproved = false;
  let hasDeclined = false;

  for (const doc of snap.docs) {
    const status = String(doc.data().status ?? "");
    if (status === "pending") hasPending = true;
    if (status === "approved") hasApproved = true;
    if (status === "declined") hasDeclined = true;
  }

  if (hasPending) return "pending";
  if (hasApproved) return "approved";
  if (hasDeclined) return "declined";
  return "none";
}

/** Batch-load unlock statuses for many students (one company). */
export async function getUnlockRequestStatusMap(
  companyId: string,
  studentIds: string[],
): Promise<Map<string, UnlockRequestStatus>> {
  const map = new Map<string, UnlockRequestStatus>();
  for (const id of studentIds) map.set(id, "none");
  if (studentIds.length === 0) return map;

  const snap = await adminDb
    .collection("requests")
    .where("type", "==", PROFILE_UNLOCK_TYPE)
    .where("companyId", "==", companyId)
    .get();

  const byStudent = new Map<
    string,
    { pending: boolean; approved: boolean; declined: boolean }
  >();

  for (const doc of snap.docs) {
    const data = doc.data();
    const studentId = String(data.studentId ?? "");
    if (!studentId || !map.has(studentId)) continue;
    const entry = byStudent.get(studentId) ?? {
      pending: false,
      approved: false,
      declined: false,
    };
    const status = String(data.status ?? "");
    if (status === "pending") entry.pending = true;
    if (status === "approved") entry.approved = true;
    if (status === "declined") entry.declined = true;
    byStudent.set(studentId, entry);
  }

  for (const [studentId, entry] of byStudent) {
    if (entry.pending) map.set(studentId, "pending");
    else if (entry.approved) map.set(studentId, "approved");
    else if (entry.declined) map.set(studentId, "declined");
  }

  return map;
}

export async function createProfileUnlockRequest(options: {
  companyId: string;
  companyName: string;
  studentId: string;
  matchId?: string | null;
  request?: Request;
}): Promise<{ id: string; alreadyPending: boolean }> {
  const { companyId, studentId } = options;

  const existing = await adminDb
    .collection("requests")
    .where("type", "==", PROFILE_UNLOCK_TYPE)
    .where("companyId", "==", companyId)
    .where("studentId", "==", studentId)
    .where("status", "==", "pending")
    .limit(1)
    .get();

  if (!existing.empty) {
    return { id: existing.docs[0]!.id, alreadyPending: true };
  }

  let matchId = options.matchId ?? null;
  if (!matchId) {
    const matchSnap = await adminDb
      .collection("matches")
      .where("companyId", "==", companyId)
      .where("studentId", "==", studentId)
      .limit(1)
      .get();
    matchId = matchSnap.empty ? null : matchSnap.docs[0]!.id;
  }

  const studentSnap = await adminDb.collection("students").doc(studentId).get();
  if (!studentSnap.exists) {
    throw new Error("student_not_found");
  }

  const ref = adminDb.collection("requests").doc();
  const candidateLabel = anonymizedDisplayName(studentId);

  await ref.set(
    stripUndefined({
      id: ref.id,
      type: PROFILE_UNLOCK_TYPE,
      companyId,
      studentId,
      matchId: matchId || null,
      payload: {
        companyName: options.companyName,
        studentId,
        matchId: matchId || null,
        candidateLabel,
      },
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
    }),
  );

  void notifyAdminsOfPending(
    `${options.companyName} requested unlock for ${candidateLabel}`,
    options.request,
    {
      link: "/admin/unlock-requests",
      title: "Profile unlock request",
    },
  );

  return { id: ref.id, alreadyPending: false };
}

async function ensureMatchForUnlock(options: {
  companyId: string;
  studentId: string;
  matchId?: string | null;
}): Promise<string> {
  const { companyId, studentId } = options;

  if (options.matchId) {
    const existing = await adminDb.collection("matches").doc(options.matchId).get();
    if (existing.exists) return options.matchId;
  }

  const byPair = await adminDb
    .collection("matches")
    .where("companyId", "==", companyId)
    .where("studentId", "==", studentId)
    .limit(1)
    .get();

  if (!byPair.empty) return byPair.docs[0]!.id;

  const id = matchDocId(companyId, studentId);
  const byId = await adminDb.collection("matches").doc(id).get();
  if (byId.exists) return id;

  const [companySnap, studentSnap, stagesSnap] = await Promise.all([
    adminDb.collection("companies").doc(companyId).get(),
    adminDb.collection("students").doc(studentId).get(),
    adminDb.collection("pipeline_stages").orderBy("order", "asc").limit(1).get(),
  ]);

  if (!companySnap.exists || !studentSnap.exists) {
    throw new Error("not_found");
  }

  const company = companySnap.data()!;
  const student = studentSnap.data()!;
  const stageId = stagesSnap.docs[0]?.id ?? "pipeline_new_match";
  const matchScore = computeMatchScore({
    student: {
      fullName: student.fullName ?? "",
      sector: student.sector ?? "",
      seniority: student.seniority ?? "",
      currentCity: student.currentCity ?? "",
      targetCities: student.targetCities ?? [],
      bio: student.bio ?? "",
      skills: student.skills ?? [],
      availability: student.availability ?? "",
      cvUrl: student.cvUrl ?? null,
      linkedinUrl: student.linkedinUrl ?? null,
      portfolioUrl: student.portfolioUrl ?? null,
      photoUrl: student.photoUrl ?? null,
    },
    company: {
      industry: company.industry ?? "",
      preferredLocations: company.preferredLocations ?? [],
      requirementTags: company.requirementTags ?? [],
    },
  });

  await adminDb
    .collection("matches")
    .doc(id)
    .set(
      stripUndefined({
        id,
        companyId,
        studentId,
        stageId,
        shortlisted: false,
        matchScore,
        source: "company_browsed",
        identityUnlocked: false,
        notes: [],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }),
    );

  return id;
}

export async function approveProfileUnlock(options: {
  requestId: string;
  adminUid: string;
  note?: string;
  httpRequest?: Request;
}): Promise<{ matchId: string; companyId: string; studentId: string }> {
  const reqSnap = await adminDb.collection("requests").doc(options.requestId).get();
  if (!reqSnap.exists) throw new Error("not_found");

  const data = reqSnap.data()!;
  if (data.type !== PROFILE_UNLOCK_TYPE) throw new Error("invalid_type");
  if (data.status !== "pending") throw new Error("not_pending");

  const companyId = String(data.companyId ?? "");
  const studentId = String(data.studentId ?? "");
  if (!companyId || !studentId) throw new Error("invalid_request");

  const matchId = await ensureMatchForUnlock({
    companyId,
    studentId,
    matchId: data.matchId ? String(data.matchId) : null,
  });

  await adminDb
    .collection("matches")
    .doc(matchId)
    .update(
      stripUndefined({
        identityUnlocked: true,
        identityUnlockedAt: FieldValue.serverTimestamp(),
        identityUnlockedBy: options.adminUid,
        updatedAt: FieldValue.serverTimestamp(),
      }),
    );

  await upsertMatchAccess(companyId, studentId);

  await reqSnap.ref.update(
    stripUndefined({
      status: "approved",
      matchId,
      resolvedAt: FieldValue.serverTimestamp(),
      resolvedBy: options.adminUid,
      note: options.note || null,
    }),
  );

  const companySnap = await adminDb.collection("companies").doc(companyId).get();
  const company = companySnap.data();
  const ownerUid = String(company?.userId ?? companyId);
  const profileLink = `/employer/talent-pool/${matchId}`;
  const candidateLabel = anonymizedDisplayName(studentId);

  void createNotification({
    userId: ownerUid,
    type: "match_update",
    title: "Profile unlocked",
    body: `Identity for ${candidateLabel} is now available.`,
    link: profileLink,
  });

  void notifyProfileUnlocked({
    companyUserId: ownerUid,
    companyEmail: String(company?.contactEmail ?? ""),
    companyName: String(company?.name ?? ""),
    candidateLabel,
    profileUrl: profileLink,
    request: options.httpRequest,
  });

  return { matchId, companyId, studentId };
}

export async function declineProfileUnlock(options: {
  requestId: string;
  adminUid: string;
  note?: string;
}): Promise<void> {
  const reqSnap = await adminDb.collection("requests").doc(options.requestId).get();
  if (!reqSnap.exists) throw new Error("not_found");

  const data = reqSnap.data()!;
  if (data.type !== PROFILE_UNLOCK_TYPE) throw new Error("invalid_type");
  if (data.status !== "pending") throw new Error("not_pending");

  await reqSnap.ref.update(
    stripUndefined({
      status: "declined",
      resolvedAt: FieldValue.serverTimestamp(),
      resolvedBy: options.adminUid,
      note: options.note || null,
    }),
  );
}
