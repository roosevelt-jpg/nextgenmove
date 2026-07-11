import { WorkspacePortalShell } from "@/components/layout/workspace-portal-shell";
import { getCurrentUser, getSessionActor } from "@/lib/auth";
import { getSiteSettings } from "@/lib/collections/site-settings";

const NAV_ITEMS = [
  { key: "dashboard", href: "/employer/dashboard" },
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
  const [actor, user] = await Promise.all([getSessionActor(), getCurrentUser()]);
  const impersonating =
    Boolean(user?.actorUid) && user?.role === "company"
      ? {
          displayName: user.displayName,
          email: user.email,
          role: user.role,
        }
      : null;
  const previewMode = actor?.role === "admin" && !impersonating;

  const labels: Record<string, string> = {
    ...(settings.formLabels ?? {}),
    ...(settings.employerNavLabels ?? {}),
    ...(settings.adminPageLabels?.shell ?? {}),
    talentPool: settings.employerNavLabels?.talentPool ?? "Talent Pool",
    dashboard: settings.employerNavLabels?.dashboard ?? "Dashboard",
    profile: settings.employerNavLabels?.profile ?? "Our Profile",
    workspaceStudent: "Student",
    workspaceEmployer: "Employer",
    workspaceAdmin: "Admin",
    globalSettings: "Settings",
    settings: "Settings",
    publicSite: "Public site",
    signOut: "Sign out",
    workspacePreviewBanner:
      settings.adminPageLabels?.shell?.workspacePreviewBanner ??
      "Admin preview — read-only shell. Open CRM for live student and employer records.",
    workspaceImpersonationBanner:
      settings.adminPageLabels?.shell?.workspaceImpersonationBanner ??
      "Viewing as {name}.",
    openCrm: settings.adminPageLabels?.shell?.openCrm ?? "Open CRM",
    exitImpersonation:
      settings.adminPageLabels?.shell?.exitImpersonation ?? "Exit view-as",
  };

  return (
    <WorkspacePortalShell
      workspace="employer"
      sectionLabel={labels.employerSection ?? "Employer"}
      navItems={NAV_ITEMS}
      labels={labels}
      siteName={settings.siteName ?? "Venturo"}
      brandMark={settings.brandMark ?? "V"}
      previewMode={previewMode}
      impersonation={impersonating}
    >
      {children}
    </WorkspacePortalShell>
  );
}
