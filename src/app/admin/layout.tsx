import { RoleGate } from "@/components/auth/role-gate";
import { AdminPortalShell } from "@/components/admin/admin-portal-shell";
import { getSiteSettings } from "@/lib/collections/site-settings";
import {
  DEFAULT_ADMIN_NAV_LABELS,
  mergeNavLabels,
} from "@/lib/portal/nav-label-defaults";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();
  const labels = {
    ...(settings.formLabels ?? {}),
    ...mergeNavLabels(DEFAULT_ADMIN_NAV_LABELS, settings.adminNavLabels),
    ...(settings.adminPageLabels?.shell ?? {}),
  };

  return (
    <RoleGate allowedRoles={["admin"]}>
      <AdminPortalShell
        labels={labels}
        siteName={settings.siteName ?? "Venturo"}
        brandMark={settings.brandMark ?? "V"}
      >
        {children}
      </AdminPortalShell>
    </RoleGate>
  );
}
