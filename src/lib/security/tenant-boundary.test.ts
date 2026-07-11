import { describe, expect, it } from "vitest";
import { getRequiredRoleForPath } from "@/lib/auth/constants";
import {
  assertCompanyOwnsResource,
  assertStudentOwnsResource,
  getRequiredRoleForApiPath,
  roleMayAccessApiPath,
  TenantBoundaryError,
} from "@/lib/security/tenant-boundary";

describe("portal route RBAC map", () => {
  it("requires correct roles for portal prefixes", () => {
    expect(getRequiredRoleForPath("/admin/crm")).toBe("admin");
    expect(getRequiredRoleForPath("/employer/pipeline")).toBe("company");
    expect(getRequiredRoleForPath("/student/store")).toBe("student");
    expect(getRequiredRoleForPath("/pricing")).toBeNull();
  });
});

describe("API path RBAC map", () => {
  it("blocks cross-role API access", () => {
    expect(getRequiredRoleForApiPath("/api/employer/matches")).toBe("company");
    expect(roleMayAccessApiPath("company", "/api/employer/matches")).toBe(true);
    expect(roleMayAccessApiPath("student", "/api/employer/matches")).toBe(false);
    expect(roleMayAccessApiPath("company", "/api/admin/users")).toBe(false);
    expect(roleMayAccessApiPath("admin", "/api/admin/users")).toBe(true);
  });
});

describe("tenant boundary — company pipeline isolation", () => {
  it("allows company to access its own match", () => {
    expect(() =>
      assertCompanyOwnsResource("company_a", "company_a"),
    ).not.toThrow();
  });

  it("blocks company from reading another company's match", () => {
    expect(() =>
      assertCompanyOwnsResource("company_b", "company_a"),
    ).toThrow(TenantBoundaryError);
  });

  it("blocks empty company id", () => {
    expect(() => assertCompanyOwnsResource(null, "company_a")).toThrow(
      TenantBoundaryError,
    );
  });
});

describe("tenant boundary — student ownership", () => {
  it("blocks student from mutating another student's resource", () => {
    expect(() =>
      assertStudentOwnsResource("student_b", "student_a"),
    ).toThrow(TenantBoundaryError);
  });
});
