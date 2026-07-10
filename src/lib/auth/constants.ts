import type { UserRole } from "@/types/user";

export const SESSION_COOKIE_NAME = "__session";
export const ROLE_COOKIE_NAME = "__ngm_role";

/** 5 days — matches Firebase session cookie expiry. */
export const SESSION_EXPIRES_IN_MS = 60 * 60 * 24 * 5 * 1000;

export const PORTAL_HOME: Record<UserRole, string> = {
  admin: "/admin",
  company: "/employer",
  student: "/student",
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
  return pathname === "/sign-in" || pathname === "/sign-up";
}
