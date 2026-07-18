/** Hardcoded portal nav labels — used when CMS strings are blank or missing. */

export const DEFAULT_ADMIN_NAV_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  crm: "CRM",
  contact: "Contact",
  integrations: "Integrations",
  library: "Content Library",
  content: "Homepage Content",
  levers: "Program Levers",
  settings: "Settings",
  users: "Users",
  account: "My account",
  adminSection: "Admin",
  workspaceSection: "Workspace",
  workspaceStudent: "Student",
  workspaceEmployer: "Employer",
  workspaceAdmin: "Admin",
  publicSite: "Public site",
  signOut: "Sign out",
  globalSettings: "Settings",
};

export const DEFAULT_STUDENT_NAV_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  jobs: "Jobs",
  applications: "Applied jobs",
  wallet: "Wallet",
  store: "Content store",
  profile: "My Profile",
  settings: "Settings",
};

export const DEFAULT_EMPLOYER_NAV_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  talentPool: "Talent pool",
  jobs: "Opportunities",
  pipeline: "Pipeline",
  shortlist: "Shortlist",
  profile: "Our Profile",
  settings: "Settings",
};

/** Prefer CMS value when non-empty; otherwise fallback. */
export function labelOr(
  value: string | undefined | null,
  fallback: string,
): string {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || fallback;
}

export function mergeNavLabels(
  defaults: Record<string, string>,
  overlay: Record<string, string> | undefined | null,
): Record<string, string> {
  const merged = { ...defaults };
  if (!overlay) return merged;
  for (const [key, value] of Object.entries(overlay)) {
    if (typeof value === "string" && value.trim()) {
      merged[key] = value.trim();
    }
  }
  return merged;
}
