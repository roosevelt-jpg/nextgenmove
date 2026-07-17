import { WorkspacePortalShell } from "@/components/layout/workspace-portal-shell";
import { getCurrentUser, getSessionActor } from "@/lib/auth";
import { getSiteSettings } from "@/lib/collections/site-settings";
import {
  DEFAULT_STUDENT_NAV_LABELS,
  mergeNavLabels,
} from "@/lib/portal/nav-label-defaults";

const NAV_ITEMS = [
  { key: "dashboard", href: "/student/dashboard" },
  { key: "jobs", href: "/student/jobs" },
  { key: "applications", href: "/student/applications" },
  { key: "wallet", href: "/student/wallet" },
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
  const [actor, user] = await Promise.all([getSessionActor(), getCurrentUser()]);
  const impersonating =
    Boolean(user?.actorUid) && user?.role === "student"
      ? {
          displayName: user.displayName,
          email: user.email,
          role: user.role,
        }
      : null;
  const previewMode = actor?.role === "admin" && !impersonating;
  const showAdminWorkspace = actor?.role === "admin" || Boolean(impersonating);

  const labels: Record<string, string> = {
    ...(settings.formLabels ?? {}),
    ...mergeNavLabels(DEFAULT_STUDENT_NAV_LABELS, settings.studentNavLabels),
    ...(settings.adminPageLabels?.shell ?? {}),
    workspaceStudent: "Student",
    workspaceEmployer: "Employer",
    workspaceAdmin: "Admin",
    globalSettings: "Settings",
    publicSite: "Public site",
    signOut: "Sign out",
    studentSection: "Student",
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
      workspace="student"
      sectionLabel={labels.studentSection ?? "Student"}
      navItems={NAV_ITEMS}
      labels={labels}
      siteName={settings.siteName ?? "Nextgenmove"}
      brandMark={settings.brandMark ?? "N"}
      previewMode={previewMode}
      impersonation={impersonating}
      showAdminWorkspace={showAdminWorkspace}
    >
      {children}
    </WorkspacePortalShell>
  );
}
