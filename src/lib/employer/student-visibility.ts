/**
 * Projects student profile fields for employer APIs.
 * Identity (name, photo, contact, CV, links) is only included when unlocked.
 */

export type UnlockRequestStatus = "none" | "pending" | "approved" | "declined";

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
  /** Reserved for Professional Readiness Assessment scores. */
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
  assessment: unknown | null;
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
    description: e.description,
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
    workExperience: unlocked ? (student.workExperience ?? null) : null,
    workExperienceEntries: redactWorkEntries(
      student.workExperienceEntries,
      unlocked,
    ),
    assessment: student.assessment ?? null,
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
