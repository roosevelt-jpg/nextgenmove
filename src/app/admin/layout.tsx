import { RoleGate } from "@/components/auth/role-gate";
import { AdminPortalShell } from "@/components/admin/admin-portal-shell";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();
  const labels = {
    ...(settings.formLabels ?? {}),
    ...(settings.adminNavLabels ?? {}),
    ...(settings.adminPageLabels?.shell ?? {}),
  };

  return (
    <RoleGate allowedRoles={["admin"]}>
      <AdminPortalShell
        labels={labels}
        siteName={settings.siteName ?? "NextGen Move"}
        brandMark={settings.brandMark ?? "NG"}
      >
        {children}
      </AdminPortalShell>
    </RoleGate>
  );
}
