import { redirect } from "next/navigation";
import { getCurrentUser, getSessionActor, hasRole } from "@/lib/auth";
import { PORTAL_HOME } from "@/lib/auth/constants";
import type { UserRole } from "@/types/user";

export interface RoleGateProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export async function RoleGate({ allowedRoles, children }: RoleGateProps) {
  const actor = await getSessionActor();

  if (!actor) {
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
