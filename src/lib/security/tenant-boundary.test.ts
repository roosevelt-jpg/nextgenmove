import { describe, expect, it } from "vitest";
import {
  getRequiredRoleForPath,
  roleMayAccessPortalPath,
  resolvePostAuthRedirect,
} from "@/lib/auth/constants";
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

  it("allows admin to preview student and employer portals", () => {
    expect(roleMayAccessPortalPath("admin", "/student/dashboard")).toBe(true);
    expect(roleMayAccessPortalPath("admin", "/employer/dashboard")).toBe(true);
    expect(roleMayAccessPortalPath("student", "/employer/dashboard")).toBe(
      false,
    );
    expect(
      roleMayAccessPortalPath("admin", "/admin/crm"),
    ).toBe(true);
    expect(
      roleMayAccessPortalPath("student", "/admin/crm"),
    ).toBe(false);
  });

  it("allows impersonated subject role via options", () => {
    expect(
      roleMayAccessPortalPath("admin", "/student/dashboard", {
        subjectRole: "student",
      }),
    ).toBe(true);
    expect(
      roleMayAccessPortalPath("admin", "/employer/pipeline", {
        subjectRole: "student",
      }),
    ).toBe(true); // admin preview still allowed even if subject is student
  });

  it("resolves admin next into student portal", () => {
    expect(resolvePostAuthRedirect("admin", "/student/dashboard")).toBe(
      "/student/dashboard",
    );
    expect(resolvePostAuthRedirect("student", "/employer/dashboard")).toBe(
      "/student/dashboard",
    );
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

  it("allows admin preview access to student and employer APIs", () => {
    expect(roleMayAccessApiPath("admin", "/api/student/dashboard")).toBe(true);
    expect(roleMayAccessApiPath("admin", "/api/employer/matches")).toBe(true);
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
