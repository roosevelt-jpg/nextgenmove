import { RoleGate } from "@/components/auth/role-gate";
import { AdminNav } from "@/components/admin/admin-nav";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();
  const labels = settings.adminNavLabels ?? settings.formLabels ?? {};

  return (
    <RoleGate allowedRoles={["admin"]}>
      <div className="flex w-full flex-1 flex-col">
        <AdminNav labels={labels} />
        <div className="portal-shell min-w-0 flex-1 pb-10 pt-2">{children}</div>
      </div>
    </RoleGate>
  );
}
