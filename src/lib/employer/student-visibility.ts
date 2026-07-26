/**
 * Projects student profile fields for employer APIs.
 * Identity (name, photo, contact, CV, links) is only included when unlocked.
 */

export type UnlockRequestStatus = "none" | "pending" | "approved" | "declined";

/** Fields safe for employers before NGM unlock approval. */
export const STUDENT_PUBLIC_FIELDS = [
  "id",
  "displayName",
  "sector",
  "seniority",
  "currentCity",
  "targetCities",
  "skills",
  "bio",
  "availability",
  "education",
  "workExperience",
  "workExperienceEntries",
  "assessment",
] as const;

/** Fields only after admin-approved unlock. */
export const STUDENT_PRIVATE_FIELDS = [
  "fullName",
  "email",
  "phone",
  "photoUrl",
  "linkedinUrl",
  "portfolioUrl",
  "githubUrl",
  "cvUrl",
] as const;

export interface WorkExperienceEntryView {
  company: string;
  title: string;
  from: string;
  to?: string | null;
  description?: string;
}

export interface EducationEntryView {
  institution: string;
  degree?: string;
  year?: string;
}

export interface AssessmentSectionView {
  name: string;
  score?: number | null;
  maxScore?: number | null;
  level?: string | null;
}

export interface AssessmentView {
  overallScore?: number | null;
  overallLabel?: string | null;
  sections: AssessmentSectionView[];
  summary?: string | null;
}

export interface StudentVisibilityInput {
  id: string;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  sector?: string | null;
  seniority?: string | null;
  currentCity?: string | null;
  targetCities?: string[] | null;
  skills?: string[] | null;
  bio?: string | null;
  availability?: string | null;
  photoUrl?: string | null;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
  githubUrl?: string | null;
  cvUrl?: string | null;
  workExperience?: string | null;
  workExperienceEntries?: WorkExperienceEntryView[] | null;
  education?: EducationEntryView[] | null;
  /** Professional Readiness Assessment scores/sections. */
  assessment?: unknown;
}

export interface StudentPublicView {
  id: string;
  displayName: string;
  identityUnlocked: boolean;
  unlockRequestStatus: UnlockRequestStatus;
  sector: string;
  seniority: string;
  currentCity: string;
  targetCities: string[];
  skills: string[];
  bio: string;
  availability: string;
  education: EducationEntryView[];
  workExperience: string | null;
  workExperienceEntries: WorkExperienceEntryView[];
  assessment: AssessmentView | null;
  /** Identity — null/empty when locked */
  fullName: string;
  email: string;
  phone: string | null;
  photoUrl: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  githubUrl: string | null;
  cvUrl: string | null;
}

/** Stable anonymized label: "Candidate · A3F2" */
export function anonymizedDisplayName(studentId: string): string {
  const hash = studentId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase();
  return `Candidate · ${hash || "----"}`;
}

function redactWorkEntries(
  entries: WorkExperienceEntryView[] | null | undefined,
  unlocked: boolean,
): WorkExperienceEntryView[] {
  if (!entries?.length) return [];
  if (unlocked) {
    return entries.map((e) => ({
      company: e.company ?? "",
      title: e.title ?? "",
      from: e.from ?? "",
      to: e.to ?? null,
      description: e.description,
    }));
  }
  return entries.map((e) => ({
    company: "",
    title: e.title ?? "",
    from: e.from ?? "",
    to: e.to ?? null,
    description: redactContactLeak(e.description ?? "") || undefined,
  }));
}

function redactEducation(
  entries: EducationEntryView[] | null | undefined,
  unlocked: boolean,
): EducationEntryView[] {
  if (!entries?.length) return [];
  if (unlocked) {
    return entries.map((e) => ({
      institution: e.institution ?? "",
      degree: e.degree,
      year: e.year,
    }));
  }
  return entries.map((e) => ({
    institution: "",
    degree: e.degree,
    year: e.year,
  }));
}

/** Strip emails/phones from free-text so locked profiles stay non-identifying. */
export function redactContactLeak(text: string): string {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[redacted]")
    .trim();
}

function redactFreeTextExperience(
  text: string | null | undefined,
  unlocked: boolean,
): string | null {
  if (!text?.trim()) return null;
  if (unlocked) return text;
  const redacted = redactContactLeak(text);
  return redacted || null;
}

export function normalizeAssessment(raw: unknown): AssessmentView | null {
  if (raw == null) return null;

  if (typeof raw === "number" && Number.isFinite(raw)) {
    return {
      overallScore: raw,
      overallLabel: null,
      sections: [],
      summary: null,
    };
  }

  if (typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;

  const sectionsRaw = Array.isArray(data.sections)
    ? data.sections
    : Array.isArray(data.scores)
      ? data.scores
      : [];

  const sections: AssessmentSectionView[] = [];
  for (const item of sectionsRaw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const name = String(row.name ?? row.label ?? row.section ?? "").trim();
    if (!name) continue;
    sections.push({
      name,
      score:
        typeof row.score === "number"
          ? row.score
          : typeof row.value === "number"
            ? row.value
            : null,
      maxScore:
        typeof row.maxScore === "number"
          ? row.maxScore
          : typeof row.max === "number"
            ? row.max
            : null,
      level: row.level != null ? String(row.level) : null,
    });
  }

  const overallScore =
    typeof data.overallScore === "number"
      ? data.overallScore
      : typeof data.score === "number"
        ? data.score
        : typeof data.total === "number"
          ? data.total
          : null;

  const overallLabel =
    data.overallLabel != null
      ? String(data.overallLabel)
      : data.label != null
        ? String(data.label)
        : null;

  const summary =
    data.summary != null
      ? String(data.summary)
      : data.narrative != null
        ? String(data.narrative)
        : null;

  if (
    overallScore == null &&
    !overallLabel &&
    !summary &&
    sections.length === 0
  ) {
    return null;
  }

  return {
    overallScore,
    overallLabel,
    sections,
    summary,
  };
}

/** Non-identifying haystack for employer search filters. */
export function anonymizedSearchHaystack(student: StudentVisibilityInput): string {
  return [
    student.currentCity,
    student.sector,
    student.seniority,
    student.availability,
    ...(student.skills ?? []),
    ...(student.targetCities ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function projectStudentForEmployer(
  student: StudentVisibilityInput,
  options: {
    identityUnlocked: boolean;
    unlockRequestStatus?: UnlockRequestStatus;
  },
): StudentPublicView {
  const unlocked = options.identityUnlocked;
  const unlockRequestStatus =
    options.unlockRequestStatus ?? (unlocked ? "approved" : "none");

  const displayName = unlocked
    ? String(student.fullName ?? "").trim() || anonymizedDisplayName(student.id)
    : anonymizedDisplayName(student.id);

  return {
    id: student.id,
    displayName,
    identityUnlocked: unlocked,
    unlockRequestStatus,
    sector: student.sector ?? "",
    seniority: student.seniority ?? "",
    currentCity: student.currentCity ?? "",
    targetCities: student.targetCities ?? [],
    skills: student.skills ?? [],
    bio: student.bio ?? "",
    availability: student.availability ?? "",
    education: redactEducation(student.education, unlocked),
    workExperience: redactFreeTextExperience(student.workExperience, unlocked),
    workExperienceEntries: redactWorkEntries(
      student.workExperienceEntries,
      unlocked,
    ),
    assessment: normalizeAssessment(student.assessment),
    fullName: unlocked ? (student.fullName ?? "") : "",
    email: unlocked ? (student.email ?? "") : "",
    phone: unlocked ? (student.phone ?? null) : null,
    photoUrl: unlocked ? (student.photoUrl ?? null) : null,
    linkedinUrl: unlocked ? (student.linkedinUrl ?? null) : null,
    portfolioUrl: unlocked ? (student.portfolioUrl ?? null) : null,
    githubUrl: unlocked ? (student.githubUrl ?? null) : null,
    cvUrl: unlocked ? (student.cvUrl ?? null) : null,
  };
}

export function isMatchIdentityUnlocked(match: Record<string, unknown> | {
  identityUnlocked?: unknown;
}): boolean {
  return match.identityUnlocked === true;
}

/** Student-visible applications only (not company-browsed interest). */
export function isStudentInitiatedMatch(match: {
  source?: unknown;
  jobPostingId?: unknown;
}): boolean {
  const source = String(match.source ?? "");
  if (source === "student_applied") return true;
  if (source === "company_browsed" || source === "admin_curated") return false;
  // Legacy student applications often have a job posting and no source.
  return Boolean(match.jobPostingId);
}
