export type UserRole = "student" | "employer" | "admin" | "super-admin";

export interface SessionUser {
  uid: string;
  email: string | null;
  role: UserRole;
}

/**
 * Session and role helpers — implemented in a later phase.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  return null;
}

export function hasRole(user: SessionUser | null, ...roles: UserRole[]): boolean {
  if (!user) {
    return false;
  }

  return roles.includes(user.role);
}
