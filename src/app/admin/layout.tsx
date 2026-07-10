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
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
        <AdminNav labels={labels} />
        {children}
      </div>
    </RoleGate>
  );
}
