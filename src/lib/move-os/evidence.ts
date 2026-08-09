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

const INACTIVE_EVIDENCE_STATUSES = new Set<EvidenceStatus>([
  "archived",
  "superseded",
  "expired",
  "rejected",
]);

function isActiveVerified(
  item: Pick<EvidenceItem, "kind" | "status" | "expiresAt">,
  nowIso: string,
): boolean {
  if (item.status !== "verified") return false;
  if (item.expiresAt && item.expiresAt <= nowIso) return false;
  return true;
}

export function computeReadiness(
  items: Array<Pick<EvidenceItem, "kind" | "status" | "expiresAt">>,
  levers: Awaited<ReturnType<typeof getMoveOsLevers>>,
): StudentReadiness {
  const nowIso = isoNow();
  const verifiedKinds = new Set(
    items
      .filter((item) => isActiveVerified(item, nowIso))
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

/** Prior (superseded) versions grouped by evidence kind, newest first. */
export type EvidencePriorVersion = Pick<
  EvidenceItem,
  "id" | "kind" | "label" | "status" | "createdAt" | "updatedAt" | "verifiedAt"
>;

export function listSupersededByKind(
  items: EvidenceItem[],
): Partial<Record<EvidenceKind, EvidencePriorVersion[]>> {
  const byKind: Partial<Record<EvidenceKind, EvidencePriorVersion[]>> = {};
  for (const item of items) {
    if (item.status !== "superseded") continue;
    const entry: EvidencePriorVersion = {
      id: item.id,
      kind: item.kind,
      label: item.label,
      status: item.status,
      createdAt: item.createdAt ?? null,
      updatedAt: item.updatedAt ?? null,
      verifiedAt: item.verifiedAt ?? null,
    };
    const list = byKind[item.kind] ?? [];
    list.push(entry);
    byKind[item.kind] = list;
  }
  for (const kind of Object.keys(byKind) as EvidenceKind[]) {
    byKind[kind]?.sort((a, b) => {
      const aT = a.createdAt ? Date.parse(a.createdAt) : 0;
      const bT = b.createdAt ? Date.parse(b.createdAt) : 0;
      return bT - aT;
    });
  }
  return byKind;
}

/** Superseded siblings for a given kind (excludes `exceptId` if provided). */
export function listSupersededSiblings(
  items: EvidenceItem[],
  kind: EvidenceKind,
  exceptId?: string,
): EvidencePriorVersion[] {
  return (listSupersededByKind(items)[kind] ?? []).filter(
    (item) => item.id !== exceptId,
  );
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
        missingKinds: next.missingKinds,
        verifiedKinds: next.verifiedKinds,
        readinessMissingKinds: next.missingKinds,
      }),
      { merge: true },
    );
  return next;
}

/** Alias used by Phase 2 call sites. */
export const recomputeStudentReadiness = recomputeAndPersistStudentReadiness;

async function supersedePriorEvidenceOfKind(
  studentId: string,
  kind: EvidenceKind,
  exceptId?: string,
): Promise<void> {
  const snap = await adminDb
    .collection("evidence_items")
    .where("studentId", "==", studentId)
    .where("kind", "==", kind)
    .get();
  const now = isoNow();
  const batch = adminDb.batch();
  let writes = 0;
  for (const doc of snap.docs) {
    if (exceptId && doc.id === exceptId) continue;
    const status = String(doc.data().status ?? "") as EvidenceStatus;
    if (INACTIVE_EVIDENCE_STATUSES.has(status)) continue;
    batch.set(
      doc.ref,
      stripUndefined({
        status: "superseded" as EvidenceStatus,
        updatedAt: now,
      }),
      { merge: true },
    );
    writes += 1;
  }
  if (writes > 0) await batch.commit();
}

export async function createEvidenceItem(input: {
  studentId: string;
  kind: EvidenceKind;
  label: string;
  file: StorageFileRef;
  expiresAt?: string | null;
}): Promise<EvidenceItem> {
  await supersedePriorEvidenceOfKind(input.studentId, input.kind);

  const ref = adminDb.collection("evidence_items").doc();
  const now = isoNow();
  const expiresAt =
    input.expiresAt && !Number.isNaN(Date.parse(input.expiresAt))
      ? new Date(input.expiresAt).toISOString()
      : null;
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
    expiresAt,
    createdAt: now,
    updatedAt: now,
  });
  await ref.set(doc);
  await recomputeAndPersistStudentReadiness(input.studentId);
  return doc as EvidenceItem;
}

export async function updateEvidenceItem(input: {
  evidenceId: string;
  expiresAt?: string | null;
  label?: string;
  file?: StorageFileRef;
}): Promise<EvidenceItem> {
  const ref = adminDb.collection("evidence_items").doc(input.evidenceId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("evidence_not_found");
  const data = snap.data() as EvidenceItem;
  const now = isoNow();

  let expiresAt: string | null | undefined = undefined;
  if (input.expiresAt !== undefined) {
    expiresAt =
      input.expiresAt && !Number.isNaN(Date.parse(input.expiresAt))
        ? new Date(input.expiresAt).toISOString()
        : null;
  }

  const patch = stripUndefined({
    label: input.label,
    file: input.file,
    expiresAt,
    updatedAt: now,
  });
  await ref.set(patch, { merge: true });
  await recomputeAndPersistStudentReadiness(data.studentId);
  return {
    id: data.id,
    studentId: data.studentId,
    kind: data.kind,
    label: input.label ?? data.label,
    file: input.file ?? data.file,
    status: data.status,
    notes: data.notes ?? null,
    verifiedBy: data.verifiedBy ?? null,
    verifiedAt: data.verifiedAt ?? null,
    expiresAt:
      expiresAt !== undefined ? expiresAt : (data.expiresAt ?? null),
    createdAt: data.createdAt ?? null,
    updatedAt: now,
  };
}

export async function setEvidenceStatus(input: {
  evidenceId: string;
  status: EvidenceStatus;
  adminId: string;
  notes?: string | null;
  expiresAt?: string | null;
}): Promise<EvidenceItem> {
  const ref = adminDb.collection("evidence_items").doc(input.evidenceId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("evidence_not_found");
  const data = snap.data() as EvidenceItem;
  const now = isoNow();

  let expiresAt: string | null | undefined = undefined;
  if (input.expiresAt !== undefined) {
    expiresAt =
      input.expiresAt && !Number.isNaN(Date.parse(input.expiresAt))
        ? new Date(input.expiresAt).toISOString()
        : null;
  }

  await ref.set(
    stripUndefined({
      status: input.status,
      notes: input.notes ?? data.notes ?? null,
      verifiedBy: input.status === "verified" ? input.adminId : data.verifiedBy,
      verifiedAt: input.status === "verified" ? now : data.verifiedAt,
      expiresAt,
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
    expiresAt:
      expiresAt !== undefined ? expiresAt : (data.expiresAt ?? null),
    updatedAt: now,
  };
}
