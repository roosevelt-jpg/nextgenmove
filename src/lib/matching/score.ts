import type { StudentDocument } from "@/lib/student/session";
import { calculateProfileCompleteness } from "@/lib/student/session";

export interface MatchScoreInputs {
  student: Pick<
    StudentDocument,
    | "skills"
    | "currentCity"
    | "targetCities"
    | "sector"
    | "bio"
    | "cvUrl"
    | "fullName"
    | "seniority"
    | "availability"
    | "photoUrl"
    | "linkedinUrl"
    | "portfolioUrl"
  >;
  company?: {
    industry?: string;
    preferredLocations?: string[];
    requirementTags?: string[];
  } | null;
}

export interface MatchScoreBreakdown {
  total: number;
  skills: number;
  location: number;
  completeness: number;
  reasons: string[];
}

/**
 * Blueprint §5.1 v1 — explainable weighted score (0–100).
 * skills overlap 60% + location fit 20% + profile completeness 20%.
 */
export function scoreWithBreakdown(
  inputs: MatchScoreInputs,
): MatchScoreBreakdown {
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

  const locationHit =
    preferred.length > 0 &&
    studentLocations.some((loc) => preferred.includes(loc));
  const locationScore =
    preferred.length === 0
      ? studentLocations.length > 0
        ? 0.75
        : 0.4
      : locationHit
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

  const skills = Math.round(skillsScore * 100);
  const location = Math.round(locationScore * 100);
  const completenessPct = Math.round(completeness * 100);
  const raw = skillsScore * 0.6 + locationScore * 0.2 + completeness * 0.2;
  const totalScore = Math.max(0, Math.min(100, Math.round(raw * 100)));

  const reasons: string[] = [];
  if (requirementTags.length === 0) {
    reasons.push(
      studentSkills.length > 0
        ? "Skills listed; no company requirement tags to match"
        : "Few skills listed and no company requirement tags",
    );
  } else {
    const haveSet = new Set(studentSkills);
    const hits = requirementTags.filter((tag) => haveSet.has(tag));
    reasons.push(
      hits.length
        ? `Skills overlap: ${hits.join(", ")} (${hits.length}/${requirementTags.length})`
        : `No overlap with required tags (${requirementTags.slice(0, 3).join(", ")})`,
    );
  }

  if (preferred.length === 0) {
    reasons.push(
      studentLocations.length > 0
        ? "Location present; company has no preferred locations"
        : "No student or company location signals",
    );
  } else if (locationHit) {
    reasons.push("Location fits company preferred cities");
  } else {
    reasons.push("Location does not match company preferred cities");
  }

  reasons.push(`Profile completeness ${completenessPct}%`);

  return {
    total: totalScore,
    skills,
    location,
    completeness: completenessPct,
    reasons,
  };
}

/** @deprecated Prefer scoreWithBreakdown; kept for call-site compatibility. */
export function computeMatchScore(inputs: MatchScoreInputs): number {
  return scoreWithBreakdown(inputs).total;
}

/** Alias matching Phase 2 naming. */
export function score(inputs: MatchScoreInputs): number {
  return scoreWithBreakdown(inputs).total;
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
