import type { CreditTopUpPackage, ProgramLeversDocument } from "@/types/cms";
import { defaultProgramLevers } from "@/lib/collections/pages";

const DEFAULT_COMPANY_PACKS: CreditTopUpPackage[] = [
  {
    id: "company_pack_200",
    label: "Bench starter",
    credits: 200,
    priceEur: 250,
    companyCredits: true,
  },
  {
    id: "company_pack_500",
    label: "Commit pack",
    credits: 500,
    priceEur: 550,
    companyCredits: true,
  },
  {
    id: "company_pack_1000",
    label: "Scale pack",
    credits: 1000,
    priceEur: 1000,
    companyCredits: true,
  },
];

/** Resolve employer company-credit packs from levers (dedicated list, flag, or defaults). */
export function resolveCompanyCreditPackages(
  levers: ProgramLeversDocument | null | undefined,
): CreditTopUpPackage[] {
  const dedicated = levers?.companyCreditTopUpPackages ?? [];
  if (dedicated.length > 0) return dedicated;

  const flagged = (levers?.creditTopUpPackages ?? []).filter(
    (pack) => pack.companyCredits === true,
  );
  if (flagged.length > 0) return flagged;

  const fallback = defaultProgramLevers().companyCreditTopUpPackages;
  return fallback?.length ? fallback : DEFAULT_COMPANY_PACKS;
}
