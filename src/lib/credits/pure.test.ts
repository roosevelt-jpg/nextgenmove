import { describe, expect, it } from "vitest";
import {
  assertSufficientCredits,
  canTransitionPlanRequest,
  computeNextCredits,
} from "@/lib/credits/pure";

describe("credit pure helpers", () => {
  it("computes next balance", () => {
    expect(computeNextCredits(10, -3)).toBe(7);
    expect(computeNextCredits(10, 5)).toBe(15);
  });

  it("rejects overspend", () => {
    expect(() => assertSufficientCredits(2, 5)).toThrow("insufficient_credits");
    expect(() => assertSufficientCredits(5, 5)).not.toThrow();
  });
});

describe("plan request state machine", () => {
  it("allows pending → actioned|dismissed|reviewed only", () => {
    expect(canTransitionPlanRequest("pending", "actioned")).toBe(true);
    expect(canTransitionPlanRequest("pending", "dismissed")).toBe(true);
    expect(canTransitionPlanRequest("actioned", "dismissed")).toBe(false);
    expect(canTransitionPlanRequest("pending", "pending")).toBe(false);
  });
});
