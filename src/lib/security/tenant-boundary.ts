/**
 * Tenant / role boundary helpers — pure functions covered by automated tests.
 * Money-adjacent and PII-adjacent routes must call these before returning data.
 */

export class TenantBoundaryError extends Error {
  constructor(message = "tenant_boundary_violation") {
    super(message);
    this.name = "TenantBoundaryError";
  }
}

/** Company A must never read/write Company B's match rows. */
export function assertCompanyOwnsResource(
  resourceCompanyId: string | null | undefined,
  sessionCompanyId: string,
): void {
  if (!resourceCompanyId || resourceCompanyId !== sessionCompanyId) {
    throw new TenantBoundaryError();
  }
}

/** Student A must never mutate Student B's credit / profile rows via API. */
export function assertStudentOwnsResource(
  resourceStudentId: string | null | undefined,
  sessionStudentId: string,
): void {
  if (!resourceStudentId || resourceStudentId !== sessionStudentId) {
    throw new TenantBoundaryError();
  }
}

export type PortalRole = "admin" | "company" | "student";

/** API path → required role (mirrors portal route map; used in boundary tests). */
export function getRequiredRoleForApiPath(pathname: string): PortalRole | null {
  if (pathname.startsWith("/api/admin")) return "admin";
  if (pathname.startsWith("/api/employer")) return "company";
  if (pathname.startsWith("/api/student")) return "student";
  return null;
}

export function roleMayAccessApiPath(
  role: PortalRole,
  pathname: string,
): boolean {
  const required = getRequiredRoleForApiPath(pathname);
  if (!required) return true;
  if (role === required) return true;
  // Admins may call student/employer APIs (preview or impersonation overlay).
  if (role === "admin" && (required === "student" || required === "company")) {
    return true;
  }
  return false;
}
