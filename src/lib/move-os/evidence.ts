import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";
import type { StorageFileRef } from "@/lib/storage/file-ref";
import type {
  BenchStatus,
  EvidenceItem,
  EvidenceKind,
  EvidenceStatus,
  StudentReadiness,
} from "@/types/move-os";
import { getMoveOsLevers } from "./config";

function isoNow() {
  return new Date().toISOString();
}

export function computeReadiness(
  items: Array<Pick<EvidenceItem, "kind" | "status">>,
  levers: Awaited<ReturnType<typeof getMoveOsLevers>>,
): StudentReadiness {
  const verifiedKinds = new Set(
    items
      .filter((item) => item.status === "verified")
      .map((item) => item.kind),
  );

  let score = 0;
  let maxScore = 0;
  for (const kind of levers.evidenceRequiredKinds) {
    const weight = Number(levers.evidenceKindWeights[kind] ?? 0);
    maxScore += weight;
    if (verifiedKinds.has(kind)) score += weight;
  }

  // Bonus kinds beyond required
  for (const [kind, weight] of Object.entries(levers.evidenceKindWeights)) {
    if (levers.evidenceRequiredKinds.includes(kind as EvidenceKind)) continue;
    const w = Number(weight ?? 0);
    if (w <= 0) continue;
    maxScore += w;
    if (verifiedKinds.has(kind as EvidenceKind)) score += w;
  }

  const missingKinds = levers.evidenceRequiredKinds.filter(
    (kind) => !verifiedKinds.has(kind),
  );
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const benchStatus: BenchStatus =
    pct >= levers.benchReadyMinScore && missingKinds.length === 0
      ? "ready"
      : "not_ready";

  return {
    score: pct,
    maxScore: 100,
    benchStatus,
    verifiedKinds: [...verifiedKinds],
    missingKinds,
    updatedAt: isoNow(),
  };
}

export async function listStudentEvidence(
  studentId: string,
): Promise<EvidenceItem[]> {
  const snap = await adminDb
    .collection("evidence_items")
    .where("studentId", "==", studentId)
    .get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      studentId: String(data.studentId ?? studentId),
      kind: data.kind as EvidenceKind,
      label: String(data.label ?? data.kind ?? ""),
      file: data.file as StorageFileRef,
      status: (data.status as EvidenceStatus) ?? "pending",
      notes: data.notes == null ? null : String(data.notes),
      verifiedBy: data.verifiedBy == null ? null : String(data.verifiedBy),
      verifiedAt: data.verifiedAt == null ? null : String(data.verifiedAt),
      expiresAt: data.expiresAt == null ? null : String(data.expiresAt),
      createdAt: data.createdAt == null ? null : String(data.createdAt),
      updatedAt: data.updatedAt == null ? null : String(data.updatedAt),
    };
  });
}

export async function recomputeAndPersistStudentReadiness(
  studentId: string,
): Promise<StudentReadiness> {
  const [items, levers, studentSnap] = await Promise.all([
    listStudentEvidence(studentId),
    getMoveOsLevers(),
    adminDb.collection("students").doc(studentId).get(),
  ]);
  const readiness = computeReadiness(items, levers);
  const existingBench = String(studentSnap.data()?.benchStatus ?? "");
  // Preserve reserved/placed if already on bench lifecycle.
  const benchStatus: BenchStatus =
    existingBench === "reserved" || existingBench === "placed"
      ? (existingBench as BenchStatus)
      : readiness.benchStatus;

  const next = { ...readiness, benchStatus };
  await adminDb
    .collection("students")
    .doc(studentId)
    .set(
      stripUndefined({
        dubaiReadyScore: next.score,
        benchStatus: next.benchStatus,
        readinessUpdatedAt: FieldValue.serverTimestamp(),
        readinessMissingKinds: next.missingKinds,
      }),
      { merge: true },
    );
  return next;
}

export async function createEvidenceItem(input: {
  studentId: string;
  kind: EvidenceKind;
  label: string;
  file: StorageFileRef;
}): Promise<EvidenceItem> {
  const ref = adminDb.collection("evidence_items").doc();
  const now = isoNow();
  const doc = stripUndefined({
    id: ref.id,
    studentId: input.studentId,
    kind: input.kind,
    label: input.label,
    file: input.file,
    status: "pending" as EvidenceStatus,
    notes: null,
    verifiedBy: null,
    verifiedAt: null,
    expiresAt: null,
    createdAt: now,
    updatedAt: now,
  });
  await ref.set(doc);
  await recomputeAndPersistStudentReadiness(input.studentId);
  return doc as EvidenceItem;
}

export async function setEvidenceStatus(input: {
  evidenceId: string;
  status: EvidenceStatus;
  adminId: string;
  notes?: string | null;
}): Promise<EvidenceItem> {
  const ref = adminDb.collection("evidence_items").doc(input.evidenceId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("evidence_not_found");
  const data = snap.data() as EvidenceItem;
  const now = isoNow();
  await ref.set(
    stripUndefined({
      status: input.status,
      notes: input.notes ?? data.notes ?? null,
      verifiedBy: input.status === "verified" ? input.adminId : data.verifiedBy,
      verifiedAt: input.status === "verified" ? now : data.verifiedAt,
      updatedAt: now,
    }),
    { merge: true },
  );
  await recomputeAndPersistStudentReadiness(data.studentId);
  return {
    ...data,
    status: input.status,
    notes: input.notes ?? data.notes ?? null,
    verifiedBy: input.status === "verified" ? input.adminId : data.verifiedBy,
    verifiedAt: input.status === "verified" ? now : data.verifiedAt,
    updatedAt: now,
  };
}
