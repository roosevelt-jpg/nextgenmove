import type { StorageFileRef } from "@/lib/storage/file-ref";

/** Evidence kinds that feed the Dubai-Ready score / Visa-Cleared Bench. */
export const EVIDENCE_KINDS = [
  "passport",
  "cv",
  "funds_proof",
  "english_proof",
  "attested_portfolio",
  "housing_readiness",
  "visa_eligibility_pack",
  "other",
] as const;

export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export type EvidenceStatus = "pending" | "verified" | "rejected" | "expired";

export interface EvidenceItem {
  id: string;
  studentId: string;
  kind: EvidenceKind;
  label: string;
  file: StorageFileRef;
  status: EvidenceStatus;
  notes?: string | null;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  expiresAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export type BenchStatus =
  | "not_ready"
  | "ready"
  | "reserved"
  | "placed"
  | "inactive";

export interface StudentReadiness {
  score: number;
  maxScore: number;
  benchStatus: BenchStatus;
  verifiedKinds: EvidenceKind[];
  missingKinds: EvidenceKind[];
  updatedAt?: string | null;
}

export type MoveMilestoneKey =
  | "dual_commit"
  | "shadow_sprint"
  | "visa"
  | "housing"
  | "flight"
  | "bank"
  | "emirates_id"
  | "arrival"
  | "day_one";

export type MoveMilestoneStatus =
  | "locked"
  | "pending"
  | "in_progress"
  | "blocked"
  | "done"
  | "skipped";

export interface MoveMilestone {
  key: MoveMilestoneKey;
  label: string;
  status: MoveMilestoneStatus;
  dueAt?: string | null;
  completedAt?: string | null;
  blocker?: string | null;
  visibleToSponsor?: boolean;
}

export type MoveItineraryStatus =
  | "draft"
  | "active"
  | "completed"
  | "cancelled"
  | "sla_breached";

export interface MoveItinerary {
  id: string;
  matchId: string;
  studentId: string;
  companyId: string;
  status: MoveItineraryStatus;
  startDate?: string | null;
  milestones: MoveMilestone[];
  createdAt?: string | null;
  updatedAt?: string | null;
}

export type BenchReservationStatus =
  | "held"
  | "converted"
  | "expired"
  | "cancelled";

export interface BenchReservation {
  id: string;
  companyId: string;
  studentId: string;
  matchId?: string | null;
  status: BenchReservationStatus;
  expiresAt: string;
  createdAt?: string | null;
}

export type EscrowParty = "student" | "company";
export type EscrowStatus = "locked" | "released" | "forfeited" | "refunded";

export interface CreditEscrow {
  id: string;
  matchId: string;
  moveId: string;
  party: EscrowParty;
  partyId: string;
  amount: number;
  status: EscrowStatus;
  createdAt?: string | null;
  resolvedAt?: string | null;
}

export type ShadowSprintStatus =
  | "proposed"
  | "active"
  | "submitted"
  | "rated"
  | "go"
  | "no_go"
  | "cancelled";

export interface ShadowSprint {
  id: string;
  matchId: string;
  moveId: string;
  studentId: string;
  companyId: string;
  title: string;
  brief: string;
  status: ShadowSprintStatus;
  deliverableUrl?: string | null;
  studentRating?: number | null;
  companyRating?: number | null;
  studentGo?: boolean | null;
  companyGo?: boolean | null;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt?: string | null;
}

export type ArrivalEventKind =
  | "landed"
  | "housing_checkin"
  | "day_one"
  | "sla_miss"
  | "sla_met";

export interface ArrivalEvent {
  id: string;
  moveId: string;
  matchId: string;
  kind: ArrivalEventKind;
  notedBy: string;
  notedAt: string;
  note?: string | null;
}

export interface SponsorLink {
  id: string;
  studentId: string;
  token: string;
  sponsorName: string;
  sponsorEmail: string;
  status: "active" | "revoked";
  createdAt?: string | null;
  lastAccessAt?: string | null;
}

export interface MoveOsLevers {
  evidenceRequiredKinds: EvidenceKind[];
  evidenceKindWeights: Partial<Record<EvidenceKind, number>>;
  benchReadyMinScore: number;
  benchHoldHours: number;
  dualCommitStudentCredits: number;
  dualCommitCompanyCredits: number;
  arrivalSlaHours: number;
  shadowSprintDays: number;
  sponsorEnabled: boolean;
}
