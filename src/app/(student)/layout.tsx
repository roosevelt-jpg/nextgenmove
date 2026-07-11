import { RoleGate } from "@/components/auth/role-gate";

export default function StudentLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <RoleGate allowedRoles={["student", "admin"]}>{children}</RoleGate>
  );
}
