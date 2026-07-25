import { describe, expect, it } from "vitest";
import { normalizeToE164 } from "@/lib/phone/e164";

describe("normalizeToE164", () => {
  it("keeps valid E.164 numbers", () => {
    expect(normalizeToE164("+971501234567")).toBe("+971501234567");
  });

  it("strips spaces and punctuation", () => {
    expect(normalizeToE164("+971 50 123 4567")).toBe("+971501234567");
    expect(normalizeToE164("+1 (415) 555-2671")).toBe("+14155552671");
  });

  it("converts 00 prefix", () => {
    expect(normalizeToE164("00971501234567")).toBe("+971501234567");
  });

  it("adds + when missing", () => {
    expect(normalizeToE164("971501234567")).toBe("+971501234567");
  });

  it("returns null for empty or invalid", () => {
    expect(normalizeToE164("")).toBeNull();
    expect(normalizeToE164("123")).toBeNull();
    expect(normalizeToE164(null)).toBeNull();
  });
});
