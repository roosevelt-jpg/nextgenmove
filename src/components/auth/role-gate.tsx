import { redirect } from "next/navigation";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { PORTAL_HOME } from "@/lib/auth/constants";
import type { UserRole } from "@/types/user";

export interface RoleGateProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export async function RoleGate({ allowedRoles, children }: RoleGateProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  if (!hasRole(user, ...allowedRoles)) {
    redirect(PORTAL_HOME[user.role]);
  }

  return children;
}
