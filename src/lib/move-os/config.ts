import { adminDb } from "@/lib/firebase-admin";
import type { EvidenceKind, MoveOsLevers } from "@/types/move-os";
import { EVIDENCE_KINDS } from "@/types/move-os";

export const DEFAULT_MOVE_OS_LEVERS: MoveOsLevers = {
  evidenceRequiredKinds: [
    "passport",
    "cv",
    "funds_proof",
    "english_proof",
    "visa_eligibility_pack",
  ],
  evidenceKindWeights: {
    passport: 20,
    cv: 10,
    funds_proof: 20,
    english_proof: 15,
    attested_portfolio: 10,
    housing_readiness: 10,
    visa_eligibility_pack: 15,
    other: 0,
  },
  benchReadyMinScore: 70,
  benchHoldHours: 72,
  dualCommitStudentCredits: 50,
  dualCommitCompanyCredits: 100,
  arrivalSlaHours: 72,
  shadowSprintDays: 5,
  sponsorEnabled: true,
};

export async function getMoveOsLevers(): Promise<MoveOsLevers> {
  try {
    const snap = await adminDb.collection("program_levers").doc("default").get();
    const raw = (snap.data()?.moveOs ?? {}) as Partial<MoveOsLevers>;
    const required = Array.isArray(raw.evidenceRequiredKinds)
      ? (raw.evidenceRequiredKinds.filter((k): k is EvidenceKind =>
          (EVIDENCE_KINDS as readonly string[]).includes(String(k)),
        ) as EvidenceKind[])
      : DEFAULT_MOVE_OS_LEVERS.evidenceRequiredKinds;

    return {
      ...DEFAULT_MOVE_OS_LEVERS,
      ...raw,
      evidenceRequiredKinds:
        required.length > 0
          ? required
          : DEFAULT_MOVE_OS_LEVERS.evidenceRequiredKinds,
      evidenceKindWeights: {
        ...DEFAULT_MOVE_OS_LEVERS.evidenceKindWeights,
        ...(raw.evidenceKindWeights ?? {}),
      },
    };
  } catch {
    return DEFAULT_MOVE_OS_LEVERS;
  }
}
