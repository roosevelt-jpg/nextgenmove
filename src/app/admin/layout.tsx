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
      <div className="page-container mx-auto flex w-full max-w-page flex-1 flex-col py-6">
        <AdminNav labels={labels} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </RoleGate>
  );
}
