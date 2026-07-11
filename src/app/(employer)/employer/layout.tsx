import { WorkspacePortalShell } from "@/components/layout/workspace-portal-shell";
import { getSiteSettings } from "@/lib/collections/site-settings";

const NAV_ITEMS = [
  { key: "talentPool", href: "/employer/talent-pool" },
  { key: "pipeline", href: "/employer/pipeline" },
  { key: "shortlist", href: "/employer/shortlist" },
  { key: "profile", href: "/employer/profile" },
];

export default async function EmployerPortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();
  const labels: Record<string, string> = {
    ...(settings.formLabels ?? {}),
    ...(settings.employerNavLabels ?? {}),
    ...(settings.adminPageLabels?.shell ?? {}),
    talentPool: settings.employerNavLabels?.talentPool ?? "Talent Pool",
    profile: settings.employerNavLabels?.profile ?? "Our Profile",
    workspaceStudent: "Student",
    workspaceEmployer: "Employer",
    workspaceAdmin: "Admin",
    globalSettings: "Global Settings",
    publicSite: "Public site",
    signOut: "Sign out",
  };

  return (
    <WorkspacePortalShell
      workspace="employer"
      sectionLabel={labels.employerSection ?? "Employer"}
      navItems={NAV_ITEMS}
      labels={labels}
      siteName={settings.siteName ?? "Venturo"}
      brandMark={settings.brandMark ?? "V"}
    >
      {children}
    </WorkspacePortalShell>
  );
}
