import type { UserRole } from "@/types/user";

export const SESSION_COOKIE_NAME = "__session";
export const ROLE_COOKIE_NAME = "__ngm_role";
export { IMPERSONATE_COOKIE_NAME } from "./impersonation-token";

/** 5 days — matches Firebase session cookie expiry. */
export const SESSION_EXPIRES_IN_MS = 60 * 60 * 24 * 5 * 1000;

export const PORTAL_HOME: Record<UserRole, string> = {
  admin: "/admin/dashboard",
  company: "/employer/dashboard",
  student: "/student/dashboard",
};

export const ROUTE_ROLE: Record<string, UserRole> = {
  "/admin": "admin",
  "/employer": "company",
  "/student": "student",
};

export function getRequiredRoleForPath(pathname: string): UserRole | null {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return "admin";
  }

  if (pathname === "/employer" || pathname.startsWith("/employer/")) {
    return "company";
  }

  if (pathname === "/student" || pathname.startsWith("/student/")) {
    return "student";
  }

  return null;
}

export function isAuthPath(pathname: string): boolean {
  return (
    pathname === "/sign-in" ||
    pathname === "/sign-up" ||
    pathname === "/forgot-password"
  );
}

/** Whether a signed-in role may open a portal path (admins may preview student/employer). */
export function roleMayAccessPortalPath(
  role: UserRole,
  pathname: string,
  options?: { subjectRole?: UserRole | null },
): boolean {
  const required = getRequiredRoleForPath(pathname);
  if (!required) return true;
  if (required === "admin") {
    return role === "admin";
  }
  if (role === required) return true;
  if (role === "admin") return true;
  if (options?.subjectRole && options.subjectRole === required) return true;
  return false;
}

/** Only allow post-login `next` paths that belong to the signed-in role. */
export function resolvePostAuthRedirect(
  role: UserRole,
  nextPath: string | null | undefined,
): string {
  const home = PORTAL_HOME[role];
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return home;
  }

  const pathname = nextPath.split("?")[0] ?? nextPath;
  if (!roleMayAccessPortalPath(role, pathname)) {
    return home;
  }

  return nextPath;
}
