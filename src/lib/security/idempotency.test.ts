import { describe, expect, it } from "vitest";
import { readIdempotencyKey } from "@/lib/security/idempotency";

describe("idempotency key header", () => {
  it("accepts Idempotency-Key", () => {
    const request = new Request("http://localhost/api/test", {
      headers: { "Idempotency-Key": "abc12345-key" },
    });
    expect(readIdempotencyKey(request)).toBe("abc12345-key");
  });

  it("rejects short keys", () => {
    const request = new Request("http://localhost/api/test", {
      headers: { "Idempotency-Key": "short" },
    });
    expect(readIdempotencyKey(request)).toBeNull();
  });

  it("returns null when missing", () => {
    const request = new Request("http://localhost/api/test");
    expect(readIdempotencyKey(request)).toBeNull();
  });
});
