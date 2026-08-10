/**
 * Projects company / employer fields for student-facing marketplace APIs.
 * Real employer identity is only included when companyIdentityUnlocked on the match.
 */

export type CompanyUnlockStatus = "none" | "pending" | "approved" | "declined";

export interface CompanyVisibilityInput {
  id: string;
  name?: string | null;
  companyName?: string | null;
  sector?: string | null;
  industry?: string | null;
  location?: string | null;
  preferredLocations?: string[] | null;
  website?: string | null;
  logoUrl?: string | null;
  contactEmail?: string | null;
  contactName?: string | null;
  phone?: string | null;
}

export interface CompanyPublicView {
  id: string;
  displayName: string;
  identityUnlocked: boolean;
  sector: string;
  industry: string;
  location: string;
  /** Identity — empty/null when locked */
  name: string;
  website: string | null;
  logoUrl: string | null;
  contactEmail: string;
}

/**
 * Stable anonymized label: "Employer · A3F2" (last 4 alphanumerics of id).
 * Prefer an existing job `employerLabel` when provided.
 */
export function anonymizedEmployerLabel(
  companyId: string,
  employerLabel?: string | null,
): string {
  const existing = String(employerLabel ?? "").trim();
  if (existing) return existing;
  const hash = companyId.replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase();
  return `Employer · ${hash || "----"}`;
}

function resolveLocation(company: CompanyVisibilityInput): string {
  if (company.location?.trim()) return company.location.trim();
  const locs = company.preferredLocations?.filter(Boolean) ?? [];
  return locs[0] ? String(locs[0]) : "";
}

export function projectCompanyForStudent(options: {
  company: CompanyVisibilityInput;
  unlocked: boolean;
  employerLabel?: string | null;
}): CompanyPublicView {
  const { company, unlocked } = options;
  const employerLabel = anonymizedEmployerLabel(
    company.id,
    options.employerLabel,
  );
  const realName =
    String(company.name ?? company.companyName ?? "").trim() || employerLabel;

  return {
    id: company.id,
    displayName: unlocked ? realName : employerLabel,
    identityUnlocked: unlocked,
    sector: company.sector ?? "",
    industry: company.industry ?? company.sector ?? "",
    location: resolveLocation(company),
    name: unlocked ? realName : "",
    website: unlocked ? (company.website ?? null) : null,
    logoUrl: unlocked ? (company.logoUrl ?? null) : null,
    contactEmail: unlocked ? String(company.contactEmail ?? "") : "",
  };
}
