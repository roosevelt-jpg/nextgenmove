/**
 * Pure credit arithmetic — unit-tested without Firestore.
 * Live mutations still go through applyCreditDelta in ledger.ts.
 */

export function computeNextCredits(current: number, delta: number): number {
  return Math.trunc(current) + Math.trunc(delta);
}

export function assertSufficientCredits(current: number, spendAmount: number): void {
  if (spendAmount <= 0) return;
  if (computeNextCredits(current, -spendAmount) < 0) {
    throw new Error("insufficient_credits");
  }
}

export type PlanRequestStatus = "pending" | "actioned" | "dismissed" | "reviewed";

export function canTransitionPlanRequest(
  from: PlanRequestStatus | string,
  to: PlanRequestStatus | string,
): boolean {
  if (from === to) return false;
  if (from === "pending") {
    return to === "actioned" || to === "dismissed" || to === "reviewed";
  }
  return false;
}
