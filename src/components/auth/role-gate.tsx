import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentUser, getSessionActor, hasRole } from "@/lib/auth";
import { PORTAL_HOME, SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import type { UserRole } from "@/types/user";

export interface RoleGateProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export async function RoleGate({ allowedRoles, children }: RoleGateProps) {
  const actor = await getSessionActor();

  if (!actor) {
    const jar = await cookies();
    // Session/role cookies present but actor unresolved (expired Auth or
    // Firestore outage) — clear cookies instead of bouncing to /sign-in,
    // which middleware would send straight back into the portal.
    if (jar.get(SESSION_COOKIE_NAME)?.value) {
      redirect("/api/auth/signout?next=/sign-in");
    }
    redirect("/sign-in");
  }

  // Admin shell always keys off the real signed-in account (not impersonation subject).
  if (allowedRoles.length === 1 && allowedRoles[0] === "admin") {
    if (actor.role !== "admin") {
      redirect(PORTAL_HOME[actor.role]);
    }
    return <>{children}</>;
  }

  const user = await getCurrentUser();

  if (!user) {
    const jar = await cookies();
    if (jar.get(SESSION_COOKIE_NAME)?.value) {
      redirect("/api/auth/signout?next=/sign-in");
    }
    redirect("/sign-in");
  }

  if (!hasRole(user, ...allowedRoles)) {
    // Preview: admin may enter student/employer portals.
    if (actor.role === "admin" && allowedRoles.some((r) => r === "student" || r === "company")) {
      return <>{children}</>;
    }
    redirect(PORTAL_HOME[user.role]);
  }

  return <>{children}</>;
}
