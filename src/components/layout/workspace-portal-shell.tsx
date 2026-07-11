"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { clearSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { LiveDateTime } from "@/components/layout/live-date-time";

export type PortalWorkspace = "student" | "employer" | "admin";

export interface PortalNavItem {
  key: string;
  href: string;
  match?: "exact" | "prefix";
}

export interface WorkspacePortalShellProps {
  workspace: PortalWorkspace;
  sectionLabel: string;
  navItems: PortalNavItem[];
  labels: Record<string, string>;
  siteName: string;
  brandMark: string;
  children: React.ReactNode;
  /** Admin browsing portal without impersonation. */
  previewMode?: boolean;
  /** Admin viewing as a real student/company. */
  impersonation?: {
    displayName: string;
    email?: string | null;
    role: string;
  } | null;
}

function isActivePath(pathname: string, item: PortalNavItem) {
  if (item.match === "exact") {
    return pathname === item.href;
  }
  if (
    item.href.endsWith("/dashboard") &&
    (pathname === item.href.replace(/\/dashboard$/, "") ||
      pathname === `${item.href.replace(/\/dashboard$/, "")}/`)
  ) {
    return true;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function WorkspacePortalShell({
  workspace,
  sectionLabel,
  navItems,
  labels,
  siteName,
  brandMark,
  children,
  previewMode = false,
  impersonation = null,
}: WorkspacePortalShellProps) {
  const pathname = usePathname();
  const [dark, setDark] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("ngm-theme");
    const preferDark =
      stored === "dark" ||
      (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(preferDark);
    document.documentElement.classList.toggle("dark", preferDark);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("ngm-theme", next ? "dark" : "light");
  };

  const activeItem = navItems.find((item) => isActivePath(pathname, item));
  const titleLabel =
    (activeItem && labels[activeItem.key]) ||
    labels.dashboard ||
    sectionLabel;

  const signOut = async () => {
    await clearSession();
    window.location.href = "/sign-in";
  };

  const exitImpersonation = async () => {
    setExiting(true);
    const response = await fetch("/api/admin/impersonate", { method: "DELETE" });
    const payload = (await response.json().catch(() => null)) as {
      redirectTo?: string;
    } | null;
    window.location.href = payload?.redirectTo ?? "/admin/dashboard";
  };

  const goAdmin = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!impersonation) return;
    event.preventDefault();
    await exitImpersonation();
  };

  const settingsHref =
    workspace === "admin"
      ? "/admin/settings"
      : workspace === "employer"
        ? "/employer/settings"
        : "/student/settings";

  const workspaceLinks = (
    [
      ["student", "/student/dashboard", labels.workspaceStudent ?? "Student"],
      [
        "employer",
        "/employer/dashboard",
        labels.workspaceEmployer ?? "Employer",
      ],
      ["admin", "/admin/dashboard", labels.workspaceAdmin ?? "Admin"],
    ] as const
  );

  const sidebar = (
    <aside className="flex h-full w-[240px] flex-col border-r border-border bg-surface-1">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-radius-sm bg-bg-purple text-[11px] font-bold text-fill-accent">
          {brandMark || "NG"}
        </span>
        <span className="font-serif text-[15px] font-semibold text-text-primary">
          {siteName || "Venturo"}
        </span>
      </div>

      <div className="px-3 pt-4">
        <p className="mb-2 px-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
          {labels.workspaceSection ?? "Workspace"}
        </p>
        <div className="flex gap-1 rounded-full bg-surface-2 p-1">
          {workspaceLinks.map(([key, href, label]) => (
            <Link
              key={key}
              href={href}
              onClick={key === "admin" ? goAdmin : undefined}
              className={cn(
                "flex min-h-7 flex-1 items-center justify-center rounded-full bg-grad-rouse px-2 text-center text-[11px] font-semibold text-on-gradient transition-opacity",
                workspace === key
                  ? "opacity-100 shadow-sm ring-2 ring-white/40"
                  : "opacity-70 hover:opacity-100",
              )}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-5 flex-1 overflow-y-auto px-3 pb-4">
        <p className="mb-2 px-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
          {sectionLabel}
        </p>
        <nav className="space-y-0.5" aria-label={workspace}>
          {navItems.map((item) => {
            const label = labels[item.key];
            if (!label) return null;
            const active = isActivePath(pathname, item);
            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "relative flex min-h-7 items-center gap-2 rounded-radius px-2.5 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-bg-purple text-fill-accent"
                    : "text-text-secondary hover:bg-surface-2 hover:text-text-primary",
                )}
              >
                {active ? (
                  <span
                    className="absolute bottom-1.5 left-0 top-1.5 w-[3px] rounded-r-sm bg-fill-accent"
                    aria-hidden
                  />
                ) : null}
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-2 border-t border-border px-3 py-3">
        <div className="px-1 sm:hidden">
          <LanguageSwitcher />
        </div>
        <Link
          href={settingsHref}
          className="flex min-h-7 items-center gap-2 rounded-radius px-2.5 py-1.5 text-xs text-text-secondary hover:bg-surface-2"
        >
          {labels.settings ?? "Settings"}
        </Link>
        <Link
          href="/"
          className="flex min-h-7 items-center gap-2 rounded-radius px-2.5 py-1.5 text-xs text-text-secondary hover:bg-surface-2"
        >
          {labels.publicSite ?? "Public site"}
        </Link>
        <button
          type="button"
          onClick={signOut}
          className="flex min-h-7 w-full items-center gap-2 rounded-radius px-2.5 py-1.5 text-left text-xs text-text-secondary hover:bg-surface-2"
        >
          {labels.signOut ?? "Sign out"}
        </button>
      </div>
    </aside>
  );

  return (
    <div className="dashboard-shell flex min-h-screen w-full bg-bg text-text-primary">
      <div className="sticky top-0 hidden h-screen shrink-0 min-[860px]:block">
        {sidebar}
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 flex min-[860px]:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 h-full shadow-xl">{sidebar}</div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex min-h-14 items-center justify-between gap-2 border-b border-border bg-surface-1 px-4 min-[860px]:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="inline-flex min-h-7 min-w-7 items-center justify-center rounded-radius-sm border border-border text-sm min-[860px]:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              ☰
            </button>
            <h1 className="truncate text-[15px] font-medium text-text-primary">
              {titleLabel}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <LiveDateTime className="mr-1 hidden text-[12px] text-text-secondary min-[860px]:inline" />
            <LanguageSwitcher className="hidden sm:block" />
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex min-h-7 min-w-7 items-center justify-center rounded-radius-sm border border-border text-text-secondary"
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {dark ? "☀" : "☾"}
            </button>
            <Link
              href={settingsHref}
              className="hidden min-h-7 min-w-7 items-center justify-center rounded-radius-sm border border-border text-text-secondary sm:inline-flex"
              aria-label="Settings"
            >
              ⚙
            </Link>
            <Link
              href={
                workspace === "admin"
                  ? "/admin/account"
                  : workspace === "employer"
                    ? "/employer/settings"
                    : "/student/settings"
              }
              className="inline-flex min-h-7 min-w-7 items-center justify-center rounded-full bg-bg-purple text-[11px] font-bold text-fill-accent"
              aria-label="Account"
            >
              {labels.avatarInitial ?? "V"}
            </Link>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 min-[860px]:px-8 min-[860px]:py-7">
          {previewMode || impersonation ? (
            <div
              className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-radius border border-border bg-surface-2 px-3 py-2 text-sm text-text-secondary"
              role="status"
            >
              <p>
                {impersonation
                  ? (
                      labels.workspaceImpersonationBanner ??
                      "Viewing as {name}."
                    ).replace(
                      "{name}",
                      impersonation.displayName ||
                        impersonation.email ||
                        impersonation.role,
                    )
                  : labels.workspacePreviewBanner ??
                    "Admin preview — read-only shell. Open CRM for live student and employer records."}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/admin/crm"
                  className="btn-brand inline-flex min-h-5 items-center whitespace-nowrap px-1.5 py-0.5 text-[10px]"
                >
                  {labels.openCrm ?? "Open CRM"}
                </Link>
                {impersonation ? (
                  <button
                    type="button"
                    disabled={exiting}
                    onClick={() => void exitImpersonation()}
                    className="btn-brand inline-flex min-h-5 items-center whitespace-nowrap px-1.5 py-0.5 text-[10px]"
                  >
                    {labels.exitImpersonation ?? "Exit view-as"}
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
