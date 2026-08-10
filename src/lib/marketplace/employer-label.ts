/**
 * Compatibility helpers for student marketplace employer labels.
 * Canonical anonymization lives in company-visibility.ts.
 */

import { anonymizedEmployerLabel } from "@/lib/marketplace/company-visibility";
import type { CompanyUnlockStatus } from "@/lib/marketplace/company-visibility";

export type { CompanyUnlockStatus };

/**
 * Prefer stored job.employerLabel; otherwise Employer · XXXX from companyId.
 * Legacy sector/location fallbacks only when companyId is missing.
 */
export function computeEmployerLabel(input: {
  companyId?: string | null;
  employerLabel?: string | null;
  department?: string | null;
  location?: string | null;
  categories?: string[] | null;
}): string {
  const explicit =
    typeof input.employerLabel === "string" ? input.employerLabel.trim() : "";
  if (explicit) return explicit;

  const companyId = String(input.companyId ?? "").trim();
  if (companyId) return anonymizedEmployerLabel(companyId);

  const sector =
    (typeof input.department === "string" && input.department.trim()) ||
    (Array.isArray(input.categories) && input.categories[0]
      ? String(input.categories[0]).trim()
      : "");
  const location =
    typeof input.location === "string" ? input.location.trim() : "";

  if (sector && location) return `${sector} employer · ${location}`;
  if (sector) return `${sector} employer`;
  if (location) return `Employer · ${location}`;
  return "Employer · ----";
}

export function resolveCompanyUnlockStatus(data: {
  companyIdentityUnlocked?: boolean | null;
  companyUnlockStatus?: string | null;
}): CompanyUnlockStatus {
  if (data.companyIdentityUnlocked === true) return "approved";
  const status = String(data.companyUnlockStatus ?? "none");
  if (
    status === "pending" ||
    status === "approved" ||
    status === "declined"
  ) {
    return status;
  }
  return "none";
}
