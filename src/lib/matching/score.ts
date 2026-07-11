import type { StudentDocument } from "@/lib/student/session";
import { calculateProfileCompleteness } from "@/lib/student/session";

export interface MatchScoreInputs {
  student: Pick<
    StudentDocument,
    "skills" | "currentCity" | "targetCities" | "sector" | "bio" | "cvUrl" | "fullName" | "seniority" | "availability" | "photoUrl" | "linkedinUrl" | "portfolioUrl"
  >;
  company?: {
    industry?: string;
    preferredLocations?: string[];
    requirementTags?: string[];
  } | null;
}

/**
 * Blueprint §5.1 v1 — explainable weighted score (0–100).
 * skills overlap 60% + location fit 20% + profile completeness 20%.
 */
export function computeMatchScore(inputs: MatchScoreInputs): number {
  const studentSkills = normalizeList(inputs.student.skills);
  const requirementTags = normalizeList([
    ...(inputs.company?.requirementTags ?? []),
    inputs.company?.industry ? String(inputs.company.industry) : "",
  ]);

  const skillsScore =
    requirementTags.length === 0
      ? studentSkills.length > 0
        ? 0.7
        : 0.35
      : weightedOverlap(requirementTags, studentSkills);

  const preferred = normalizeList([
    ...(inputs.company?.preferredLocations ?? []),
  ]);
  const studentLocations = normalizeList([
    inputs.student.currentCity,
    ...(inputs.student.targetCities ?? []),
  ]);

  const locationScore =
    preferred.length === 0
      ? studentLocations.length > 0
        ? 0.75
        : 0.4
      : studentLocations.some((loc) => preferred.includes(loc))
        ? 1
        : 0.25;

  const completeness =
    calculateProfileCompleteness({
      id: "",
      userId: "",
      email: "",
      credits: 0,
      plan: null,
      subscriptionStatus: "pending",
      status: "active",
      photoUrl: inputs.student.photoUrl ?? null,
      linkedinUrl: inputs.student.linkedinUrl ?? null,
      portfolioUrl: inputs.student.portfolioUrl ?? null,
      cvUrl: inputs.student.cvUrl ?? null,
      fullName: inputs.student.fullName ?? "",
      sector: inputs.student.sector ?? "",
      seniority: inputs.student.seniority ?? "",
      currentCity: inputs.student.currentCity ?? "",
      targetCities: inputs.student.targetCities ?? [],
      bio: inputs.student.bio ?? "",
      skills: inputs.student.skills ?? [],
      availability: inputs.student.availability ?? "",
    }) / 100;

  const raw = skillsScore * 0.6 + locationScore * 0.2 + completeness * 0.2;
  return Math.max(0, Math.min(100, Math.round(raw * 100)));
}

function normalizeList(values: Array<string | null | undefined>): string[] {
  return values
    .map((value) => (value ?? "").trim().toLowerCase())
    .filter(Boolean);
}

function weightedOverlap(required: string[], have: string[]): number {
  if (!required.length) return 0;
  const haveSet = new Set(have);
  const hits = required.filter((tag) => haveSet.has(tag)).length;
  return hits / required.length;
}
