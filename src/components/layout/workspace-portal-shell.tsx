"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { clearSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

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
}: WorkspacePortalShellProps) {
  const pathname = usePathname();
  const [dark, setDark] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const settingsHref =
    workspace === "admin"
      ? "/admin/settings"
      : workspace === "employer"
        ? "/employer/settings"
        : "/student/settings";

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
          {(
            [
              ["student", "/student/dashboard", labels.workspaceStudent ?? "Student"],
              [
                "employer",
                "/employer/talent-pool",
                labels.workspaceEmployer ?? "Employer",
              ],
              ["admin", "/admin/dashboard", labels.workspaceAdmin ?? "Admin"],
            ] as const
          ).map(([key, href, label]) => (
            <Link
              key={key}
              href={href}
              className={cn(
                "flex-1 rounded-full px-2 py-1.5 text-center text-[11px] font-semibold transition-colors",
                workspace === key
                  ? "bg-fill-primary text-on-primary"
                  : "text-text-secondary hover:text-text-primary",
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
                  "relative flex items-center gap-2.5 rounded-radius px-3 py-2 text-[13px] font-medium transition-colors",
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

      <div className="space-y-1 border-t border-border px-3 py-3">
        <Link
          href={settingsHref}
          className="flex items-center gap-2 rounded-radius px-3 py-2 text-[12.5px] text-text-secondary hover:bg-surface-2"
        >
          {labels.globalSettings ?? "Global Settings"}
        </Link>
        <Link
          href="/"
          className="flex items-center gap-2 rounded-radius px-3 py-2 text-[12.5px] text-text-secondary hover:bg-surface-2"
        >
          {labels.publicSite ?? "Public site"}
        </Link>
        <button
          type="button"
          onClick={signOut}
          className="flex w-full items-center gap-2 rounded-radius px-3 py-2 text-left text-[12.5px] text-text-secondary hover:bg-surface-2"
        >
          {labels.signOut ?? "Sign out"}
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen w-full bg-bg text-text-primary">
      <div className="sticky top-0 hidden h-screen shrink-0 md:block">{sidebar}</div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 flex md:hidden">
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
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-surface-1 px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-radius-sm border border-border px-2 py-1 text-sm md:hidden"
              onClick={() => setMobileOpen(true)}
            >
              ☰
            </button>
            <h1 className="text-[15px] font-medium text-text-primary">
              {titleLabel}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1.5 rounded-radius-sm border border-border px-2.5 text-[12px] text-text-secondary"
              aria-label="Language"
            >
              EN
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex h-8 w-8 items-center justify-center rounded-radius-sm border border-border text-text-secondary"
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {dark ? "☀" : "☾"}
            </button>
            <Link
              href={settingsHref}
              className="inline-flex h-8 w-8 items-center justify-center rounded-radius-sm border border-border text-text-secondary"
              aria-label="Settings"
            >
              ⚙
            </Link>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-bg-purple text-[11px] font-bold text-fill-accent">
              L
            </span>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-7">{children}</main>
      </div>
    </div>
  );
}
