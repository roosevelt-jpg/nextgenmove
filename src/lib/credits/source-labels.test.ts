import { describe, expect, it } from "vitest";
import {
  creditSourceLabelKey,
  defaultCreditSourceLabel,
} from "@/lib/credits/source-labels";

describe("credit source labels", () => {
  it("maps known source prefixes", () => {
    expect(creditSourceLabelKey("stripe_topup:cs_123")).toBe("tx_stripe_topup");
    expect(creditSourceLabelKey("redeem:item_1")).toBe("tx_redeem");
    expect(creditSourceLabelKey("referral:uid")).toBe("tx_referral");
    expect(defaultCreditSourceLabel("welcome")).toBe("Welcome credits");
  });
});
