import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { upsertMatchAccess } from "@/lib/match-access";
import { stripUndefined } from "@/lib/stripUndefined";
import { createNotification } from "@/lib/notifications/create";
import { notifyAdminsOfPending } from "@/lib/email/notify-admins";
import { notifyProfileUnlocked } from "@/lib/email/notify";
import { anonymizedDisplayName } from "@/lib/employer/student-visibility";
import type { UnlockRequestStatus } from "@/lib/employer/student-visibility";
import { anonymizedEmployerLabel } from "@/lib/marketplace/company-visibility";
import type { CompanyUnlockStatus } from "@/lib/marketplace/company-visibility";
import { logPiiAccess } from "@/lib/security/pii-access-log";
import { applyCreditDelta } from "@/lib/credits/ledger";
import { applyCompanyCreditDelta } from "@/lib/move-os/escrow";
import { getProgramLevers } from "@/lib/collections/pages";
import {
  approveProfileUnlock,
  createProfileUnlockRequest,
  PROFILE_UNLOCK_TYPE,
} from "@/lib/employer/profile-unlock";

export const COMPANY_UNLOCK_TYPE = "company_unlock";

export type MutualUnlockSource =
  | "admin_approve"
  | "credit_purchase"
  | "system";

/** Legacy `identityUnlocked` = student identity revealed to employer. */
export function isStudentIdentityUnlocked(
  match: Record<string, unknown> | { identityUnlocked?: unknown },
): boolean {
  return match.identityUnlocked === true;
}

export function isCompanyIdentityUnlocked(
  match:
    | Record<string, unknown>
    | { companyIdentityUnlocked?: unknown },
): boolean {
  return match.companyIdentityUnlocked === true;
}

export async function getProfileUnlockCreditCost(): Promise<number> {
  const levers = await getProgramLevers();
  const raw = Number(levers?.profileUnlockCredits ?? 0);
  return Number.isFinite(raw) && raw > 0 ? Math.trunc(raw) : 0;
}

export async function getCompanyUnlockCreditCost(): Promise<number> {
  const levers = await getProgramLevers();
  const raw = Number(levers?.companyUnlockCredits ?? 0);
  return Number.isFinite(raw) && raw > 0 ? Math.trunc(raw) : 0;
}

export async function getCompanyUnlockRequestStatus(
  studentId: string,
  matchId: string,
): Promise<CompanyUnlockStatus> {
  const snap = await adminDb
    .collection("requests")
    .where("type", "==", COMPANY_UNLOCK_TYPE)
    .where("studentId", "==", studentId)
    .where("matchId", "==", matchId)
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

/** Batch company-unlock statuses keyed by matchId for one student. */
export async function getCompanyUnlockStatusMap(
  studentId: string,
  matchIds: string[],
): Promise<Map<string, CompanyUnlockStatus>> {
  const map = new Map<string, CompanyUnlockStatus>();
  for (const id of matchIds) map.set(id, "none");
  if (matchIds.length === 0) return map;

  const snap = await adminDb
    .collection("requests")
    .where("type", "==", COMPANY_UNLOCK_TYPE)
    .where("studentId", "==", studentId)
    .get();

  const byMatch = new Map<
    string,
    { pending: boolean; approved: boolean; declined: boolean }
  >();

  for (const doc of snap.docs) {
    const data = doc.data();
    const matchId = String(data.matchId ?? "");
    if (!matchId || !map.has(matchId)) continue;
    const entry = byMatch.get(matchId) ?? {
      pending: false,
      approved: false,
      declined: false,
    };
    const status = String(data.status ?? "");
    if (status === "pending") entry.pending = true;
    if (status === "approved") entry.approved = true;
    if (status === "declined") entry.declined = true;
    byMatch.set(matchId, entry);
  }

  for (const [matchId, entry] of byMatch) {
    if (entry.pending) map.set(matchId, "pending");
    else if (entry.approved) map.set(matchId, "approved");
    else if (entry.declined) map.set(matchId, "declined");
  }

  return map;
}

export async function grantStudentIdentityUnlock(options: {
  matchId: string;
  actorUid: string;
  source: MutualUnlockSource;
  httpRequest?: Request;
}): Promise<{ matchId: string; companyId: string; studentId: string }> {
  const matchSnap = await adminDb.collection("matches").doc(options.matchId).get();
  if (!matchSnap.exists) throw new Error("not_found");

  const match = matchSnap.data()!;
  const companyId = String(match.companyId ?? "");
  const studentId = String(match.studentId ?? "");
  if (!companyId || !studentId) throw new Error("invalid_match");

  if (isStudentIdentityUnlocked(match)) {
    return { matchId: options.matchId, companyId, studentId };
  }

  await matchSnap.ref.update(
    stripUndefined({
      identityUnlocked: true,
      identityUnlockedAt: FieldValue.serverTimestamp(),
      identityUnlockedBy: options.actorUid,
      identityUnlockSource: options.source,
      updatedAt: FieldValue.serverTimestamp(),
    }),
  );

  await upsertMatchAccess(companyId, studentId);

  void logPiiAccess({
    actorUid: options.actorUid,
    studentId,
    action: "unlock_approve",
    meta: {
      matchId: options.matchId,
      companyId,
      source: options.source,
    },
  });

  const companySnap = await adminDb.collection("companies").doc(companyId).get();
  const company = companySnap.data();
  const ownerUid = String(company?.userId ?? company?.ownerId ?? companyId);
  const profileLink = `/employer/talent-pool/${options.matchId}`;
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

  return { matchId: options.matchId, companyId, studentId };
}

export async function grantCompanyIdentityUnlock(options: {
  matchId: string;
  actorUid: string;
  source: MutualUnlockSource;
}): Promise<{ matchId: string; companyId: string; studentId: string }> {
  const matchSnap = await adminDb.collection("matches").doc(options.matchId).get();
  if (!matchSnap.exists) throw new Error("not_found");

  const match = matchSnap.data()!;
  const companyId = String(match.companyId ?? "");
  const studentId = String(match.studentId ?? "");
  if (!companyId || !studentId) throw new Error("invalid_match");

  if (isCompanyIdentityUnlocked(match)) {
    return { matchId: options.matchId, companyId, studentId };
  }

  await matchSnap.ref.update(
    stripUndefined({
      companyIdentityUnlocked: true,
      companyIdentityUnlockedAt: FieldValue.serverTimestamp(),
      companyIdentityUnlockedBy: options.actorUid,
      companyIdentityUnlockSource: options.source,
      companyUnlockStatus: "approved",
      updatedAt: FieldValue.serverTimestamp(),
    }),
  );

  const companySnap = await adminDb.collection("companies").doc(companyId).get();
  const companyName = String(companySnap.data()?.name ?? "");
  const employerLabel = anonymizedEmployerLabel(companyId);
  const jobTitle = String(match.jobTitle ?? "a role");

  void createNotification({
    userId: studentId,
    type: "match_update",
    title: "Employer revealed",
    body: `Employer identity for ${jobTitle} is now available (${companyName || employerLabel}).`,
    link: "/student/applications",
  });

  return { matchId: options.matchId, companyId, studentId };
}

export async function requestCompanyUnlock(options: {
  studentId: string;
  matchId: string;
  request?: Request;
}): Promise<{ id: string; alreadyPending: boolean }> {
  const { studentId, matchId } = options;

  const matchSnap = await adminDb.collection("matches").doc(matchId).get();
  if (!matchSnap.exists) throw new Error("not_found");
  const match = matchSnap.data()!;
  if (String(match.studentId ?? "") !== studentId) {
    throw new Error("forbidden");
  }
  if (isCompanyIdentityUnlocked(match)) {
    throw new Error("already_unlocked");
  }

  const companyId = String(match.companyId ?? "");
  if (!companyId) throw new Error("invalid_match");

  const existing = await adminDb
    .collection("requests")
    .where("type", "==", COMPANY_UNLOCK_TYPE)
    .where("studentId", "==", studentId)
    .where("matchId", "==", matchId)
    .where("status", "==", "pending")
    .limit(1)
    .get();

  if (!existing.empty) {
    await matchSnap.ref.set(
      stripUndefined({
        companyUnlockStatus: "pending",
        updatedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true },
    );
    return { id: existing.docs[0]!.id, alreadyPending: true };
  }

  const employerLabel = anonymizedEmployerLabel(companyId);
  const ref = adminDb.collection("requests").doc();

  await ref.set(
    stripUndefined({
      id: ref.id,
      type: COMPANY_UNLOCK_TYPE,
      companyId,
      studentId,
      matchId,
      payload: {
        employerLabel,
        companyId,
        studentId,
        matchId,
        jobTitle: String(match.jobTitle ?? ""),
      },
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
    }),
  );

  await matchSnap.ref.set(
    stripUndefined({
      companyUnlockStatus: "pending",
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );

  void notifyAdminsOfPending(
    `Student requested unlock for ${employerLabel}`,
    options.request,
    {
      link: "/admin/unlock-requests",
      title: "Company unlock request",
    },
  );

  return { id: ref.id, alreadyPending: false };
}

export async function purchaseCompanyUnlock(options: {
  studentId: string;
  matchId: string;
  actorUid: string;
  request?: Request;
}): Promise<{
  matchId: string;
  paid: boolean;
  creditsSpent: number;
  companyUnlockStatus: CompanyUnlockStatus;
}> {
  const cost = await getCompanyUnlockCreditCost();
  if (cost <= 0) {
    throw new Error("credits_disabled");
  }

  const matchSnap = await adminDb.collection("matches").doc(options.matchId).get();
  if (!matchSnap.exists) throw new Error("not_found");
  const match = matchSnap.data()!;
  if (String(match.studentId ?? "") !== options.studentId) {
    throw new Error("forbidden");
  }
  if (isCompanyIdentityUnlocked(match)) {
    return {
      matchId: options.matchId,
      paid: false,
      creditsSpent: 0,
      companyUnlockStatus: "approved",
    };
  }

  const ledgerId = `unlock:student:${options.matchId}`;
  const debit = await applyCreditDelta({
    studentId: options.studentId,
    amount: -cost,
    source: ledgerId,
    once: true,
    ledgerId,
    request: options.request,
  });

  await grantCompanyIdentityUnlock({
    matchId: options.matchId,
    actorUid: options.actorUid,
    source: "credit_purchase",
  });

  return {
    matchId: options.matchId,
    paid: debit.applied,
    creditsSpent: debit.applied ? cost : 0,
    companyUnlockStatus: "approved",
  };
}

export async function purchaseStudentUnlock(options: {
  companyId: string;
  companyName: string;
  studentId: string;
  matchId?: string | null;
  actorUid: string;
  request?: Request;
}): Promise<{
  matchId: string;
  paid: boolean;
  creditsSpent: number;
  unlockRequestStatus: UnlockRequestStatus;
}> {
  const cost = await getProfileUnlockCreditCost();
  if (cost <= 0) {
    throw new Error("credits_disabled");
  }

  let matchId = options.matchId ?? null;
  if (!matchId) {
    const matchSnap = await adminDb
      .collection("matches")
      .where("companyId", "==", options.companyId)
      .where("studentId", "==", options.studentId)
      .limit(1)
      .get();
    if (matchSnap.empty) throw new Error("not_found");
    matchId = matchSnap.docs[0]!.id;
  }

  const matchSnap = await adminDb.collection("matches").doc(matchId).get();
  if (!matchSnap.exists || matchSnap.data()?.companyId !== options.companyId) {
    throw new Error("not_found");
  }
  if (isStudentIdentityUnlocked(matchSnap.data()!)) {
    return {
      matchId,
      paid: false,
      creditsSpent: 0,
      unlockRequestStatus: "approved",
    };
  }

  const ledgerId = `unlock:company:${matchId}`;
  const debit = await applyCompanyCreditDelta({
    companyId: options.companyId,
    amount: -cost,
    source: ledgerId,
    matchId,
    once: true,
    ledgerId,
    meta: { studentId: options.studentId },
  });

  await grantStudentIdentityUnlock({
    matchId,
    actorUid: options.actorUid,
    source: "credit_purchase",
    httpRequest: options.request,
  });

  return {
    matchId,
    paid: debit.applied,
    creditsSpent: debit.applied ? cost : 0,
    unlockRequestStatus: "approved",
  };
}

export async function approveCompanyUnlock(options: {
  requestId: string;
  adminUid: string;
  note?: string;
}): Promise<{ matchId: string; companyId: string; studentId: string }> {
  const reqSnap = await adminDb.collection("requests").doc(options.requestId).get();
  if (!reqSnap.exists) throw new Error("not_found");

  const data = reqSnap.data()!;
  if (data.type !== COMPANY_UNLOCK_TYPE) throw new Error("invalid_type");
  if (data.status !== "pending") throw new Error("not_pending");

  const matchId = String(data.matchId ?? "");
  const studentId = String(data.studentId ?? "");
  if (!matchId || !studentId) throw new Error("invalid_request");

  const result = await grantCompanyIdentityUnlock({
    matchId,
    actorUid: options.adminUid,
    source: "admin_approve",
  });

  await reqSnap.ref.update(
    stripUndefined({
      status: "approved",
      matchId: result.matchId,
      resolvedAt: FieldValue.serverTimestamp(),
      resolvedBy: options.adminUid,
      note: options.note || null,
    }),
  );

  return result;
}

export async function declineCompanyUnlock(options: {
  requestId: string;
  adminUid: string;
  note?: string;
}): Promise<void> {
  const reqSnap = await adminDb.collection("requests").doc(options.requestId).get();
  if (!reqSnap.exists) throw new Error("not_found");

  const data = reqSnap.data()!;
  if (data.type !== COMPANY_UNLOCK_TYPE) throw new Error("invalid_type");
  if (data.status !== "pending") throw new Error("not_pending");

  const studentId = String(data.studentId ?? "");

  await reqSnap.ref.update(
    stripUndefined({
      status: "declined",
      resolvedAt: FieldValue.serverTimestamp(),
      resolvedBy: options.adminUid,
      note: options.note || null,
    }),
  );

  const matchId = String(data.matchId ?? "");
  if (matchId) {
    await adminDb
      .collection("matches")
      .doc(matchId)
      .set(
        stripUndefined({
          companyUnlockStatus: "declined",
          updatedAt: FieldValue.serverTimestamp(),
        }),
        { merge: true },
      );
  }

  if (studentId) {
    void createNotification({
      userId: studentId,
      type: "match_update",
      title: "Employer unlock declined",
      body: "Your request to reveal the employer was declined.",
      link: "/student/applications",
    });
  }
}

/** Employer path: request (admin) or optional credit instant unlock. */
export async function employerUnlockStudent(options: {
  mode: "request" | "credits";
  companyId: string;
  companyName: string;
  studentId: string;
  matchId?: string | null;
  actorUid: string;
  request?: Request;
}): Promise<{
  id?: string;
  matchId?: string;
  alreadyPending?: boolean;
  unlockRequestStatus: UnlockRequestStatus;
  paid?: boolean;
  creditsSpent?: number;
}> {
  if (options.mode === "credits") {
    const result = await purchaseStudentUnlock({
      companyId: options.companyId,
      companyName: options.companyName,
      studentId: options.studentId,
      matchId: options.matchId,
      actorUid: options.actorUid,
      request: options.request,
    });
    return {
      matchId: result.matchId,
      unlockRequestStatus: result.unlockRequestStatus,
      paid: result.paid,
      creditsSpent: result.creditsSpent,
    };
  }

  const created = await createProfileUnlockRequest({
    companyId: options.companyId,
    companyName: options.companyName,
    studentId: options.studentId,
    matchId: options.matchId,
    request: options.request,
  });

  return {
    id: created.id,
    alreadyPending: created.alreadyPending,
    unlockRequestStatus: "pending",
  };
}

/** Re-export admin student unlock for callers that already have a request id. */
export { approveProfileUnlock, PROFILE_UNLOCK_TYPE };
