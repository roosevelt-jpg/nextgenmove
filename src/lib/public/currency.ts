/** Map ISO currency codes to a display symbol for wallet / pricing UI. */
export function currencySymbol(code: string | null | undefined): string {
  const normalized = (code ?? "EUR").trim().toUpperCase() || "EUR";
  const map: Record<string, string> = {
    EUR: "€",
    USD: "$",
    GBP: "£",
    AED: "د.إ",
    SAR: "﷼",
    CHF: "CHF",
    CAD: "CA$",
    AUD: "A$",
  };
  return map[normalized] ?? normalized;
}

export function normalizeCurrencyCode(code: string | null | undefined): string {
  const normalized = (code ?? "EUR").trim().toUpperCase() || "EUR";
  return normalized;
}
