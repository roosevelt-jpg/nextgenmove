import { adminDb } from "@/lib/firebase-admin";
import type {
  EvidenceKind,
  MoveOsLevers,
  ShadowSprintTemplate,
} from "@/types/move-os";
import { EVIDENCE_KINDS } from "@/types/move-os";

export const DEFAULT_SHADOW_SPRINT_TEMPLATES: ShadowSprintTemplate[] = [
  {
    id: "fintech_ops",
    sector: "Fintech",
    title: "Ops readiness micro-sprint",
    brief:
      "Map a real workflow in our stack, ship a short written brief, and flag one risk before travel.",
    rubric: ["Clarity", "Ownership", "Delivery quality"],
  },
  {
    id: "hospitality_guest",
    sector: "Hospitality",
    title: "Guest journey shadow sprint",
    brief:
      "Audit a guest touchpoint, propose one improvement, and deliver a one-pager for the floor lead.",
    rubric: ["Guest empathy", "Practicality", "Communication"],
  },
  {
    id: "general_delivery",
    sector: "General",
    title: "Pre-flight delivery sprint",
    brief:
      "Complete a 5-day micro-project in our real workflow before travel and submit a shareable deliverable.",
    rubric: ["Timeliness", "Quality", "Collaboration"],
  },
];

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
  dualCommitInsuranceCredits: 50,
  arrivalSlaHours: 72,
  shadowSprintDays: 5,
  sponsorEnabled: true,
  shadowSprintTemplates: DEFAULT_SHADOW_SPRINT_TEMPLATES,
};

function normalizeTemplates(
  raw: unknown,
): ShadowSprintTemplate[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_SHADOW_SPRINT_TEMPLATES;
  }
  const parsed: ShadowSprintTemplate[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id = String(row.id ?? "").trim();
    const title = String(row.title ?? "").trim();
    const brief = String(row.brief ?? "").trim();
    if (!id || !title || !brief) continue;
    const rubric = Array.isArray(row.rubric)
      ? row.rubric.map((r) => String(r).trim()).filter(Boolean)
      : [];
    parsed.push({
      id,
      sector: String(row.sector ?? "General").trim() || "General",
      title,
      brief,
      rubric,
    });
  }
  return parsed.length > 0 ? parsed : DEFAULT_SHADOW_SPRINT_TEMPLATES;
}

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
      shadowSprintTemplates: normalizeTemplates(raw.shadowSprintTemplates),
    };
  } catch {
    return DEFAULT_MOVE_OS_LEVERS;
  }
}
