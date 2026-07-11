import { WorkspacePortalShell } from "@/components/layout/workspace-portal-shell";
import { getSiteSettings } from "@/lib/collections/site-settings";

const NAV_ITEMS = [
  { key: "dashboard", href: "/student/dashboard" },
  { key: "store", href: "/student/store" },
  { key: "profile", href: "/student/profile" },
  { key: "settings", href: "/student/settings" },
];

export default async function StudentPortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();
  const labels: Record<string, string> = {
    ...(settings.formLabels ?? {}),
    ...(settings.studentNavLabels ?? {}),
    ...(settings.adminPageLabels?.shell ?? {}),
    profile: settings.studentNavLabels?.profile ?? "My Profile",
    workspaceStudent: "Student",
    workspaceEmployer: "Employer",
    workspaceAdmin: "Admin",
    globalSettings: "Global Settings",
    publicSite: "Public site",
    signOut: "Sign out",
  };

  return (
    <WorkspacePortalShell
      workspace="student"
      sectionLabel={labels.studentSection ?? "Student"}
      navItems={NAV_ITEMS}
      labels={labels}
      siteName={settings.siteName ?? "NextGen Move"}
      brandMark={settings.brandMark ?? "NG"}
    >
      {children}
    </WorkspacePortalShell>
  );
}
