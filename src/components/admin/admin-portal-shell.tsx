"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { clearSession } from "@/lib/auth-client";
import { avatarToneClasses } from "@/lib/avatar-hue";
import { resolveBrandIconUrl } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { LiveDateTime } from "@/components/layout/live-date-time";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NotificationBell } from "@/components/layout/notification-bell";
import { DEFAULT_ADMIN_NAV_LABELS } from "@/lib/portal/nav-label-defaults";

const NAV_ITEMS = [
  { key: "dashboard", href: "/admin/dashboard", match: "exact" as const },
  { key: "crm", href: "/admin/crm", match: "prefix" as const },
  { key: "integrations", href: "/admin/integrations", match: "prefix" as const },
  { key: "library", href: "/admin/content", match: "exact" as const },
  { key: "content", href: "/admin/content/videos", match: "homepage" as const },
  { key: "levers", href: "/admin/levers", match: "prefix" as const },
  { key: "settings", href: "/admin/settings", match: "prefix" as const },
  { key: "users", href: "/admin/users", match: "prefix" as const },
] as const;

function NavIcon({ name }: { name: string }) {
  const common = "h-4 w-4 shrink-0";
  switch (name) {
    case "dashboard":
      return (
        <svg className={common} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
          <path d="M2 2h5v5H2V2zm7 0h5v5H9V2zM2 9h5v5H2V9zm7 0h5v5H9V9z" />
        </svg>
      );
    case "crm":
      return (
        <svg className={common} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <circle cx="8" cy="8" r="5.25" />
          <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      );
    case "integrations":
      return (
        <svg className={common} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M5.5 2.5h5v3h3v5h-3v3h-5v-3h-3v-5h3v-3z" />
        </svg>
      );
    case "library":
      return (
        <svg className={common} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" />
          <path d="M5 6h6M5 8.5h6M5 11h4" />
        </svg>
      );
    case "content":
      return (
        <svg className={common} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <rect x="2.5" y="3.5" width="11" height="9" rx="1.5" />
          <path d="M2.5 6.5h11" />
        </svg>
      );
    case "levers":
      return (
        <svg className={common} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M3 4.5h10M3 8h10M3 11.5h10" />
          <circle cx="6" cy="4.5" r="1.25" fill="currentColor" stroke="none" />
          <circle cx="10" cy="8" r="1.25" fill="currentColor" stroke="none" />
          <circle cx="7.5" cy="11.5" r="1.25" fill="currentColor" stroke="none" />
        </svg>
      );
    case "settings":
      return (
        <svg className={common} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" />
        </svg>
      );
    case "users":
      return (
        <svg className={common} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <circle cx="8" cy="5.5" r="2.25" />
          <path d="M3.5 13c.8-2.2 2.4-3.25 4.5-3.25S11.7 10.8 12.5 13" />
        </svg>
      );
    default:
      return <span className={common} />;
  }
}

function isNavActive(pathname: string, item: (typeof NAV_ITEMS)[number]) {
  if (item.match === "exact") {
    return (
      pathname === item.href ||
      (item.href === "/admin/dashboard" && pathname === "/admin")
    );
  }
  if (item.match === "homepage") {
    return (
      pathname.startsWith("/admin/content/") && pathname !== "/admin/content"
    );
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export interface AdminPortalShellProps {
  labels: Record<string, string>;
  siteName: string;
  brandMark: string;
  children: React.ReactNode;
  avatarUrl?: string | null;
  avatarInitial?: string;
}

export function AdminPortalShell({
  labels,
  siteName,
  brandMark,
  children,
  avatarUrl = null,
  avatarInitial,
}: AdminPortalShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeItem = NAV_ITEMS.find((item) => isNavActive(pathname, item));
  const titleLabel =
    (activeItem && labels[activeItem.key]) ||
    labels.dashboard ||
    "Dashboard";

  const signOut = async () => {
    await clearSession();
    window.location.href = "/sign-in";
  };

  const sidebar = (
    <aside className="flex h-full w-[240px] flex-col border-r border-border bg-surface-1">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolveBrandIconUrl()}
          alt=""
          className="h-8 w-8 rounded-radius-sm object-cover"
          aria-hidden
        />
        <span className="font-serif text-[15px] font-semibold text-text-primary">
          {siteName || "Nextgenmove"}
        </span>
      </div>

      <div className="px-3 pt-4">
        <p className="mb-2 px-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
          {labels.workspaceSection ?? "Workspace"}
        </p>
        <div className="flex gap-1 rounded-full bg-surface-2 p-1">
          <Link
            href="/student/dashboard"
            className="flex min-h-7 flex-1 items-center justify-center rounded-full bg-grad-rouse px-2 text-center text-[11px] font-semibold text-on-gradient opacity-70 transition-opacity hover:opacity-100"
          >
            {labels.workspaceStudent ?? "Student"}
          </Link>
          <Link
            href="/employer/dashboard"
            className="flex min-h-7 flex-1 items-center justify-center rounded-full bg-grad-rouse px-2 text-center text-[11px] font-semibold text-on-gradient opacity-70 transition-opacity hover:opacity-100"
          >
            {labels.workspaceEmployer ?? "Employer"}
          </Link>
          <Link
            href="/admin/dashboard"
            className="flex min-h-7 flex-1 items-center justify-center rounded-full bg-grad-rouse px-2 text-center text-[11px] font-semibold text-on-gradient shadow-sm ring-2 ring-white/40"
          >
            {labels.workspaceAdmin ?? "Admin"}
          </Link>
        </div>
      </div>

      <div className="mt-5 flex-1 overflow-y-auto px-3 pb-4">
        <p className="mb-2 px-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
          {labels.adminSection ?? "Admin"}
        </p>
        <nav className="space-y-0.5" aria-label="admin">
          {NAV_ITEMS.map((item) => {
            const label =
              labels[item.key]?.trim() ||
              DEFAULT_ADMIN_NAV_LABELS[item.key] ||
              item.key;
            const active = isNavActive(pathname, item);
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
                <NavIcon name={item.key} />
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
          href="/admin/account"
          className="flex min-h-7 items-center gap-2 rounded-radius px-2.5 py-1.5 text-xs text-text-secondary hover:bg-surface-2"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <circle cx="8" cy="8" r="2.25" />
            <path d="M8 1.75v1.5M8 12.75v1.5M1.75 8h1.5M12.75 8h1.5M3.4 3.4l1.06 1.06M11.54 11.54l1.06 1.06M3.4 12.6l1.06-1.06M11.54 4.46l1.06-1.06" />
          </svg>
          {labels.myAccount ?? labels.account ?? "My account"}
        </Link>
        <Link
          href="/"
          className="flex min-h-7 items-center gap-2 rounded-radius px-2.5 py-1.5 text-xs text-text-secondary hover:bg-surface-2"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <circle cx="8" cy="8" r="5.5" />
            <path d="M2.5 8h11M8 2.5c1.6 1.8 2.4 3.6 2.4 5.5S9.6 11.7 8 13.5C6.4 11.7 5.6 9.9 5.6 8S6.4 4.3 8 2.5z" />
          </svg>
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
    <div className="dashboard-shell flex min-h-screen w-full text-text-primary">
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
            <NotificationBell labels={labels} />
            <ThemeToggle />
            <Link
              href="/admin/account"
              className={`inline-flex min-h-7 min-w-7 items-center justify-center overflow-hidden rounded-full text-[11px] font-bold ${
                avatarUrl
                  ? "bg-bg-purple text-fill-accent"
                  : avatarToneClasses(
                      avatarInitial ?? labels.avatarInitial ?? "N",
                    )
              }`}
              aria-label="Account"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-7 w-7 object-cover"
                />
              ) : (
                avatarInitial ?? labels.avatarInitial ?? "N"
              )}
            </Link>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 min-[860px]:px-8 min-[860px]:py-7">
          {children}
        </main>
      </div>
    </div>
  );
}
