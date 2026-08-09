import { adminDb } from "@/lib/firebase-admin";
import { serializeForClient } from "@/lib/firestore-utils";
import { PROFILE_UNLOCK_TYPE } from "@/lib/employer/profile-unlock";

function toPlain(data: Record<string, unknown> | undefined) {
  return serializeForClient(data ?? {});
}

/** DSAR-oriented employer/company export. */
export async function buildEmployerComplianceExport(companyId: string) {
  const [
    userSnap,
    companySnap,
    unlocksSnap,
    creditSnap,
    matchesSnap,
  ] = await Promise.all([
    adminDb.collection("users").doc(companyId).get(),
    adminDb.collection("companies").doc(companyId).get(),
    adminDb
      .collection("requests")
      .where("type", "==", PROFILE_UNLOCK_TYPE)
      .where("companyId", "==", companyId)
      .get(),
    adminDb
      .collection("company_credit_transactions")
      .where("companyId", "==", companyId)
      .get(),
    adminDb.collection("matches").where("companyId", "==", companyId).get(),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    subject: "employer" as const,
    companyId,
    profile: {
      user: userSnap.exists
        ? toPlain(userSnap.data() as Record<string, unknown>)
        : null,
      company: companySnap.exists
        ? toPlain(companySnap.data() as Record<string, unknown>)
        : null,
    },
    unlocks: unlocksSnap.docs.map((doc) => ({
      id: doc.id,
      ...toPlain(doc.data() as Record<string, unknown>),
    })),
    credit_transactions: creditSnap.docs.map((doc) => ({
      id: doc.id,
      ...toPlain(doc.data() as Record<string, unknown>),
    })),
    matches: matchesSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        studentId: data.studentId ?? null,
        stageId: data.stageId ?? null,
        shortlisted: Boolean(data.shortlisted),
        applicationStatus: data.applicationStatus ?? null,
        matchScore: data.matchScore ?? null,
        identityUnlocked: Boolean(data.identityUnlocked),
        interviewAt: data.interviewAt ?? null,
        hiredAt: data.hiredAt ?? null,
        createdAt: data.createdAt ?? null,
        updatedAt: data.updatedAt ?? null,
        hasScorecard: Boolean(data.interviewScorecard),
      };
    }),
  };
}
