import { createHash, randomBytes } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { stripUndefined } from "@/lib/stripUndefined";
import type { SponsorLink } from "@/types/move-os";
import { listStudentEvidence } from "./evidence";
import { listMovesForStudent } from "./itinerary";
import { getMoveOsLevers } from "./config";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSponsorLink(input: {
  studentId: string;
  sponsorName: string;
  sponsorEmail: string;
}): Promise<{ link: SponsorLink; token: string }> {
  const levers = await getMoveOsLevers();
  if (!levers.sponsorEnabled) throw new Error("sponsor_disabled");

  const token = randomBytes(24).toString("hex");
  const ref = adminDb.collection("sponsor_links").doc();
  const link = stripUndefined({
    id: ref.id,
    studentId: input.studentId,
    token: hashToken(token),
    sponsorName: input.sponsorName.trim(),
    sponsorEmail: input.sponsorEmail.trim().toLowerCase(),
    status: "active" as const,
    createdAt: new Date().toISOString(),
    lastAccessAt: null,
  });
  await ref.set({
    ...link,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { link: link as SponsorLink, token };
}

export async function resolveSponsorToken(token: string): Promise<SponsorLink | null> {
  const hashed = hashToken(token);
  const snap = await adminDb
    .collection("sponsor_links")
    .where("token", "==", hashed)
    .where("status", "==", "active")
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0]!;
  await doc.ref.set(
    { lastAccessAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
  return { id: doc.id, ...(doc.data() as Omit<SponsorLink, "id">) };
}

/** Redacted sponsor dashboard payload — no employer confidential terms. */
export async function buildSponsorDashboard(studentId: string) {
  const [studentSnap, evidence, moves] = await Promise.all([
    adminDb.collection("students").doc(studentId).get(),
    listStudentEvidence(studentId),
    listMovesForStudent(studentId),
  ]);
  const student = studentSnap.data() ?? {};
  const activeMove = moves.find((m) => m.status === "active") ?? moves[0] ?? null;

  return {
    student: {
      displayName: String(student.fullName ?? student.displayName ?? "Talent"),
      dubaiReadyScore: Number(student.dubaiReadyScore ?? 0),
      benchStatus: String(student.benchStatus ?? "not_ready"),
    },
    evidence: evidence.map((item) => ({
      kind: item.kind,
      label: item.label,
      status: item.status,
      verifiedAt: item.verifiedAt ?? null,
    })),
    move: activeMove
      ? {
          id: activeMove.id,
          status: activeMove.status,
          startDate: activeMove.startDate ?? null,
          milestones: (activeMove.milestones ?? [])
            .filter((m) => m.visibleToSponsor !== false)
            .map((m) => ({
              key: m.key,
              label: m.label,
              status: m.status,
              dueAt: m.dueAt ?? null,
              blocker: m.blocker ?? null,
              completedAt: m.completedAt ?? null,
            })),
        }
      : null,
  };
}
