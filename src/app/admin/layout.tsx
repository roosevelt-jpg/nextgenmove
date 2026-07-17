import { RoleGate } from "@/components/auth/role-gate";
import { AdminPortalShell } from "@/components/admin/admin-portal-shell";
import { getCurrentUser } from "@/lib/auth";
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
  const [settings, user] = await Promise.all([
    getSiteSettings(),
    getCurrentUser(),
  ]);
  const labels = {
    ...(settings.formLabels ?? {}),
    ...mergeNavLabels(DEFAULT_ADMIN_NAV_LABELS, settings.adminNavLabels),
    ...(settings.adminPageLabels?.shell ?? {}),
  };

  return (
    <RoleGate allowedRoles={["admin"]}>
      <AdminPortalShell
        labels={labels}
        siteName={settings.siteName ?? "Nextgenmove"}
        brandMark={settings.brandMark ?? "N"}
        avatarUrl={user?.photoUrl ?? null}
        avatarInitial={(
          user?.displayName ||
          user?.email ||
          settings.brandMark ||
          "N"
        )
          .slice(0, 1)
          .toUpperCase()}
      >
        {children}
      </AdminPortalShell>
    </RoleGate>
  );
}
