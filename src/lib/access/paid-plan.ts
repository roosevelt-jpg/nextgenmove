export type PaidPlan = "track_a" | "track_b";
export type SubscriptionStatus = "active" | "inactive" | "pending";

export function hasActivePaidPlan(actor: {
  plan?: PaidPlan | string | null;
  subscriptionStatus?: SubscriptionStatus | string | null;
}): boolean {
  const plan = actor.plan ?? null;
  const status = actor.subscriptionStatus ?? null;
  return (
    status === "active" && (plan === "track_a" || plan === "track_b")
  );
}
