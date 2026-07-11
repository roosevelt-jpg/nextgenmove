/** Map credit_transactions.source values to stable label keys for CMS. */

export function creditSourceLabelKey(source: string): string {
  const s = source.trim().toLowerCase();
  if (s.startsWith("stripe_topup:")) return "tx_stripe_topup";
  if (s.startsWith("topup:")) return "tx_manual_topup";
  if (s.startsWith("redeem:")) return "tx_redeem";
  if (s.startsWith("referral:")) return "tx_referral";
  if (s === "welcome" || s === "registration") return "tx_welcome";
  if (s === "profile_complete") return "tx_profile_complete";
  return "tx_other";
}

export function defaultCreditSourceLabel(source: string): string {
  switch (creditSourceLabelKey(source)) {
    case "tx_stripe_topup":
      return "Card top-up";
    case "tx_manual_topup":
      return "Top-up (approved)";
    case "tx_redeem":
      return "Content unlock";
    case "tx_referral":
      return "Referral bonus";
    case "tx_welcome":
      return "Welcome credits";
    case "tx_profile_complete":
      return "Profile complete bonus";
    default:
      return source || "Adjustment";
  }
}
