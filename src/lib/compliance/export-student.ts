import { adminDb } from "@/lib/firebase-admin";
import { serializeForClient } from "@/lib/firestore-utils";
import { listStudentEvidence } from "@/lib/move-os/evidence";
import { listMovesForStudent } from "@/lib/move-os/itinerary";
import { PROFILE_UNLOCK_TYPE } from "@/lib/employer/profile-unlock";

function toPlain(data: Record<string, unknown> | undefined) {
  return serializeForClient(data ?? {});
}

/** DSAR-oriented student export — metadata only for evidence files. */
export async function buildStudentComplianceExport(studentId: string) {
  const [
    userSnap,
    studentSnap,
    consentsSnap,
    unlocksSnap,
    creditSnap,
    evidence,
    moves,
  ] = await Promise.all([
    adminDb.collection("users").doc(studentId).get(),
    adminDb.collection("students").doc(studentId).get(),
    adminDb
      .collection("consent_records")
      .where("userId", "==", studentId)
      .get(),
    adminDb
      .collection("requests")
      .where("type", "==", PROFILE_UNLOCK_TYPE)
      .where("studentId", "==", studentId)
      .get(),
    adminDb
      .collection("credit_transactions")
      .where("studentId", "==", studentId)
      .get(),
    listStudentEvidence(studentId),
    listMovesForStudent(studentId),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    subject: "student" as const,
    userId: studentId,
    profile: {
      user: userSnap.exists
        ? toPlain(userSnap.data() as Record<string, unknown>)
        : null,
      student: studentSnap.exists
        ? toPlain(studentSnap.data() as Record<string, unknown>)
        : null,
    },
    consents: consentsSnap.docs.map((doc) => ({
      id: doc.id,
      ...toPlain(doc.data() as Record<string, unknown>),
    })),
    unlocks: unlocksSnap.docs.map((doc) => ({
      id: doc.id,
      ...toPlain(doc.data() as Record<string, unknown>),
    })),
    credit_transactions: creditSnap.docs.map((doc) => ({
      id: doc.id,
      ...toPlain(doc.data() as Record<string, unknown>),
    })),
    evidence: evidence.map((item) => ({
      id: item.id,
      kind: item.kind,
      label: item.label,
      status: item.status,
      notes: item.notes ?? null,
      verifiedAt: item.verifiedAt ?? null,
      expiresAt: item.expiresAt ?? null,
      createdAt: item.createdAt ?? null,
      updatedAt: item.updatedAt ?? null,
      file: item.file
        ? {
            path: item.file.path ?? null,
            filename: item.file.filename ?? null,
            size: item.file.size ?? null,
            mimeType: item.file.mimeType ?? null,
            uploadedAt: item.file.uploadedAt ?? null,
            // URL is metadata already stored in Firestore; no binary payload.
            url: item.file.url ?? null,
          }
        : null,
    })),
    move_itineraries: moves.map((move) => serializeForClient(move)),
  };
}
