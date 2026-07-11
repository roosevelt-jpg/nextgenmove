import { RoleGate } from "@/components/auth/role-gate";

export default function EmployerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <RoleGate allowedRoles={["company", "admin"]}>{children}</RoleGate>
  );
}
