import { describe, expect, it } from "vitest";
import {
  signImpersonationToken,
  verifyImpersonationToken,
} from "@/lib/auth/impersonation-token";

describe("impersonation token", () => {
  it("round-trips actor and subject claims", async () => {
    process.env.SESSION_SECRET =
      process.env.SESSION_SECRET || "test-session-secret-for-vitest-32chars";

    const token = await signImpersonationToken({
      actorUid: "admin_1",
      subjectUid: "student_1",
      subjectRole: "student",
    });

    const payload = await verifyImpersonationToken(token);
    expect(payload).toEqual({
      actorUid: "admin_1",
      subjectUid: "student_1",
      subjectRole: "student",
    });
  });

  it("rejects tampered tokens", async () => {
    process.env.SESSION_SECRET =
      process.env.SESSION_SECRET || "test-session-secret-for-vitest-32chars";

    const token = await signImpersonationToken({
      actorUid: "admin_1",
      subjectUid: "company_1",
      subjectRole: "company",
    });

    expect(await verifyImpersonationToken(`${token}x`)).toBeNull();
  });
});
