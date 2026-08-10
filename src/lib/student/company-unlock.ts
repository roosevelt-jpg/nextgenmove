/**
 * Student-facing company unlock helpers.
 * Core grant/request/credit logic lives in marketplace/mutual-unlock.ts.
 */

import { stripUndefined } from "@/lib/stripUndefined";
import { anonymizedEmployerLabel } from "@/lib/marketplace/company-visibility";
import type { CompanyUnlockStatus } from "@/lib/marketplace/company-visibility";
import {
  COMPANY_UNLOCK_TYPE,
  getCompanyUnlockRequestStatus,
  requestCompanyUnlock as requestCompanyUnlockCore,
} from "@/lib/marketplace/mutual-unlock";
import { resolveCompanyUnlockStatus } from "@/lib/marketplace/employer-label";

export { COMPANY_UNLOCK_TYPE };
export type { CompanyUnlockStatus };

export async function getCompanyUnlockStatusForMatch(matchData: {
  companyIdentityUnlocked?: boolean | null;
  companyUnlockStatus?: string | null;
}): Promise<CompanyUnlockStatus> {
  return resolveCompanyUnlockStatus(matchData);
}

export async function requestCompanyUnlock(options: {
  studentId: string;
  matchId: string;
  companyId?: string;
  jobTitle?: string;
  request?: Request;
}): Promise<{
  id: string;
  alreadyPending: boolean;
  companyUnlockStatus: CompanyUnlockStatus;
}> {
  const result = await requestCompanyUnlockCore({
    studentId: options.studentId,
    matchId: options.matchId,
    request: options.request,
  });
  const companyUnlockStatus = await getCompanyUnlockRequestStatus(
    options.studentId,
    options.matchId,
  );
  return {
    id: result.id,
    alreadyPending: result.alreadyPending,
    companyUnlockStatus:
      companyUnlockStatus === "none" ? "pending" : companyUnlockStatus,
  };
}

export function companyFieldsForStudent(options: {
  unlocked: boolean;
  companyId?: string | null;
  companyName?: string | null;
  companyWebsite?: string | null;
  companyLogoUrl?: string | null;
  companyContactEmail?: string | null;
  job: {
    employerLabel?: string | null;
    companyId?: string | null;
  };
}): {
  employerLabel: string;
  companyName?: string;
  companyWebsite?: string;
  companyLogoUrl?: string;
  companyContactEmail?: string;
} {
  const companyId = String(
    options.companyId ?? options.job.companyId ?? "",
  ).trim();
  const employerLabel = anonymizedEmployerLabel(
    companyId || "----",
    options.job.employerLabel,
  );
  if (!options.unlocked) {
    return { employerLabel };
  }
  return stripUndefined({
    employerLabel:
      (typeof options.companyName === "string" && options.companyName.trim()) ||
      employerLabel,
    companyName: options.companyName?.trim() || undefined,
    companyWebsite: options.companyWebsite?.trim() || undefined,
    companyLogoUrl: options.companyLogoUrl?.trim() || undefined,
    companyContactEmail: options.companyContactEmail?.trim() || undefined,
  }) as {
    employerLabel: string;
    companyName?: string;
    companyWebsite?: string;
    companyLogoUrl?: string;
    companyContactEmail?: string;
  };
}
